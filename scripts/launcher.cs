// RenataQuiz.exe: starts the bundled Next.js server with the bundled node.exe and opens the browser.
// Closing this console window stops the server (node shares the console, so it gets the close event).
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;

class Launcher
{
    static int Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string node = Path.Combine(root, "runtime", "node.exe");
        string appDir = Path.Combine(root, "app");
        string server = Path.Combine(appDir, "server.js");
        Console.Title = "Renata Quiz";

        if (!File.Exists(node) || !File.Exists(server))
        {
            Console.WriteLine("Missing runtime\\node.exe or app\\server.js next to RenataQuiz.exe.");
            Console.WriteLine("Keep the whole RenataQuiz folder together. Press Enter to exit.");
            Console.ReadLine();
            return 1;
        }

        int port = FreePort(3000, 3020);
        if (port == 0)
        {
            Console.WriteLine("Ports 3000-3020 are all busy. Press Enter to exit.");
            Console.ReadLine();
            return 1;
        }

        var psi = new ProcessStartInfo(node, "\"" + server + "\"");
        psi.UseShellExecute = false;
        psi.WorkingDirectory = appDir;
        psi.EnvironmentVariables["PORT"] = port.ToString();
        psi.EnvironmentVariables["HOSTNAME"] = "127.0.0.1";
        psi.EnvironmentVariables["NODE_ENV"] = "production";
        psi.EnvironmentVariables["NEXT_TELEMETRY_DISABLED"] = "1";
        psi.EnvironmentVariables["XLSX_PATH"] = Path.Combine(root, "data", "participants.xlsx");

        Process proc = Process.Start(psi);
        string url = "http://localhost:" + port + "/";

        if (WaitForPort(port, proc, 30000))
        {
            Console.WriteLine();
            Console.WriteLine("  Renata Quiz is running:  " + url);
            Console.WriteLine("  Excel download page:     " + url + "download");
            Console.WriteLine("  Data file:               " + Path.Combine(root, "data", "participants.xlsx"));
            Console.WriteLine();
            Console.WriteLine("  Close this window to stop the quiz.");
            Console.WriteLine();
            try { Process.Start(url); } catch { }
        }
        else
        {
            Console.WriteLine("The server did not start. See the messages above.");
        }

        proc.WaitForExit();
        Console.WriteLine("Server stopped. Press Enter to exit.");
        Console.ReadLine();
        return proc.ExitCode;
    }

    static int FreePort(int from, int to)
    {
        for (int p = from; p <= to; p++)
        {
            try
            {
                var l = new TcpListener(IPAddress.Loopback, p);
                l.Start();
                l.Stop();
                return p;
            }
            catch (SocketException) { }
        }
        return 0;
    }

    static bool WaitForPort(int port, Process proc, int timeoutMs)
    {
        var sw = Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < timeoutMs && !proc.HasExited)
        {
            try
            {
                using (var c = new TcpClient()) { c.Connect(IPAddress.Loopback, port); return true; }
            }
            catch (SocketException) { Thread.Sleep(250); }
        }
        return false;
    }
}
