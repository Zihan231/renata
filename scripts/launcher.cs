// RenataQuiz.exe (kiosk launcher): starts the bundled Next.js server (hidden), then opens Chrome/Edge
// full-screen in kiosk mode. When the browser is closed (Alt+F4) the server is stopped too.
// No console window. A log is written to data\launcher.log.
// Options:  RenataQuiz.exe --stop       shut the running kiosk down cleanly (use from a shortcut or admin)
//           RenataQuiz.exe --windowed   open a normal browser window instead of kiosk mode (for testing)
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

class Launcher
{
    static string log;

    static void Log(string m)
    {
        try { File.AppendAllText(log, DateTime.Now.ToString("s") + "  " + m + Environment.NewLine); } catch { }
    }

    static int Fail(string m)
    {
        Log("ERROR: " + m);
        MessageBox.Show(m, "Renata Quiz", MessageBoxButtons.OK, MessageBoxIcon.Error);
        return 1;
    }

    static int Main(string[] args)
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string node = Path.Combine(root, "runtime", "node.exe");
        string appDir = Path.Combine(root, "app");
        string server = Path.Combine(appDir, "server.js");
        string data = Path.Combine(root, "data");
        Directory.CreateDirectory(data);
        log = Path.Combine(data, "launcher.log");
        bool windowed = Array.IndexOf(args, "--windowed") >= 0;
        string stopFlag = Path.Combine(data, "stop.flag");

        // RenataQuiz.exe --stop : ask the running kiosk to close the browser and shut the server down
        if (Array.IndexOf(args, "--stop") >= 0) { File.WriteAllText(stopFlag, "stop"); return 0; }
        try { File.Delete(stopFlag); } catch { }

        // only one copy at a time
        bool first;
        var mutex = new Mutex(true, "RenataQuizKiosk", out first);
        if (!first) return 0;

        if (!File.Exists(node) || !File.Exists(server))
            return Fail("Missing runtime\\node.exe or app\\server.js next to RenataQuiz.exe.\nKeep the whole RenataQuiz folder together.");

        int port = FreePort(3000, 3020);
        if (port == 0) return Fail("Ports 3000-3020 are all busy.");

        var psi = new ProcessStartInfo(node, "\"" + server + "\"");
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.WorkingDirectory = appDir;
        psi.EnvironmentVariables["PORT"] = port.ToString();
        psi.EnvironmentVariables["HOSTNAME"] = "127.0.0.1";
        psi.EnvironmentVariables["NODE_ENV"] = "production";
        psi.EnvironmentVariables["NEXT_TELEMETRY_DISABLED"] = "1";
        psi.EnvironmentVariables["XLSX_PATH"] = Path.Combine(data, "participants.xlsx");

        Process srv = Process.Start(psi);
        Log("server started, port " + port);
        string url = "http://localhost:" + port + "/";

        if (!WaitForPort(port, srv, 40000))
        {
            Kill(srv);
            return Fail("The quiz server did not start.");
        }

        string browser = FindBrowser();
        if (browser == null)
        {
            Log("no Chrome/Edge found, using default browser");
            try { Process.Start(url); } catch { }
            srv.WaitForExit(); // no browser handle: keep serving until the server is killed
            return 0;
        }

        string profile = Path.Combine(data, "browser-profile");
        string flags =
            (windowed ? "--new-window " : "--kiosk ") +
            "--user-data-dir=\"" + profile + "\" " +
            "--no-first-run --no-default-browser-check --disable-infobars --disable-session-crashed-bubble " +
            "--noerrdialogs --disable-translate --disable-pinch --overscroll-history-navigation=0 " +
            "--autoplay-policy=no-user-gesture-required --disable-features=Translate,TranslateUI " +
            "--check-for-update-interval=31536000 --force-device-scale-factor=1 " +
            "\"" + url + "\"";
        Log("browser: " + browser);
        Process br = Process.Start(new ProcessStartInfo(browser, flags) { UseShellExecute = false });

        // keep the kiosk alive: if the browser is closed/crashes, reopen it. Exit only with --windowed or when the server dies.
        while (!srv.HasExited)
        {
            br.WaitForExit(2000);
            if (File.Exists(stopFlag))
            {
                Log("stop requested");
                try { File.Delete(stopFlag); } catch { }
                Kill(br);
                break;
            }
            if (br.HasExited)
            {
                if (windowed) break;
                Log("browser exited, reopening");
                Thread.Sleep(1000);
                br = Process.Start(new ProcessStartInfo(browser, flags) { UseShellExecute = false });
            }
        }
        Kill(srv);
        return 0;
    }

    static string FindBrowser()
    {
        string pf = Environment.GetEnvironmentVariable("ProgramFiles");
        string pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)");
        string local = Environment.GetEnvironmentVariable("LocalAppData");
        string[] c =
        {
            Path.Combine(pf ?? "", @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf86 ?? "", @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(local ?? "", @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf86 ?? "", @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf ?? "", @"Microsoft\Edge\Application\msedge.exe"),
        };
        foreach (string p in c) if (File.Exists(p)) return p;
        return null;
    }

    static void Kill(Process p)
    {
        try { if (!p.HasExited) p.Kill(); } catch { }
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
