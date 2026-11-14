import { describe, expect, it } from "vitest";

import {
  checkSentinelInstall, launchdPlist, sentinelCommand, sentinelLaunchdPlist, sentinelServicePlan, sentinelSystemdService, sentinelSystemdTimer,
  sentinelUnitCommand, serviceCommand, servicePlan, shippedSentinelCli, systemdUnit, unstableInstallWarning, type ServiceSpec,
} from "./service-unit.ts";

const spec: ServiceSpec = {
  node: "/usr/bin/node",
  script: "/usr/lib/node_modules/unicorn/cli.js",
  serveArgs: ["--port", "8799", "--data-dir", "/home/uni/.unicorn", "--domain", "uni.example.com", "--no-pair"],
  dataDir: "/home/uni/.unicorn",
  user: "uni",
  home: "/home/uni",
  bindsLowPorts: true,
  label: "agentada",
};

describe("service units", () => {
  it("runs the same serve command, with strip-types only for a checkout", () => {
    expect(serviceCommand(spec)).toEqual(["/usr/bin/node", "/usr/lib/node_modules/unicorn/cli.js", "serve", ...spec.serveArgs]);
    expect(serviceCommand({ ...spec, script: "/srv/Unicorn/server/unicorn.ts" })[1]).toBe("--experimental-strip-types");
  });

  it("renders a systemd unit that restarts, runs as the user, and grants low ports only for --domain", () => {
    const unit = systemdUnit(spec);
    expect(unit).toContain("Description=Unicorn (agentada)");
    expect(unit).toContain("User=uni");
    expect(unit).toContain("Environment=OMB_DATA_DIR=/home/uni/.unicorn");
    expect(unit).toContain("ExecStart=/usr/bin/node /usr/lib/node_modules/unicorn/cli.js serve --port 8799 --data-dir /home/uni/.unicorn --domain uni.example.com --no-pair");
    expect(unit).toContain("Restart=always");
    expect(unit).toContain("AmbientCapabilities=CAP_NET_BIND_SERVICE");
    expect(unit).toContain("WantedBy=multi-user.target");
    const local = systemdUnit({ ...spec, bindsLowPorts: false, serveArgs: ["--port", "8799", "--data-dir", "/home/uni/.unicorn"] });
    expect(local).not.toContain("CAP_NET_BIND_SERVICE");
    expect(systemdUnit({ ...spec, dataDir: "/home/uni/My Data", serveArgs: ["--data-dir", "/home/uni/My Data"] })).toContain('ExecStart=/usr/bin/node /usr/lib/node_modules/unicorn/cli.js serve --data-dir "/home/uni/My Data"');
  });

  it("renders a launchd agent that keeps the server alive and logs under the data dir", () => {
    const plist = launchdPlist({ ...spec, home: "/Users/uni", dataDir: "/Users/uni/.unicorn" });
    expect(plist).toContain("<string>com.unicorn.serve</string>");
    expect(plist).toContain("<string>/usr/bin/node</string>");
    expect(plist).toContain("<string>serve</string>");
    expect(plist).toContain("<string>uni.example.com</string>");
    expect(plist).toContain("<key>KeepAlive</key>");
    expect(plist).toContain("/Users/uni/.unicorn/logs/service.log");
    expect(launchdPlist({ ...spec, serveArgs: ["--label", "a & b <c>"] })).toContain("<string>a &amp; b &lt;c&gt;</string>");
  });

  it("refuses to point a service at an npx cache, and knows where each platform's file goes", () => {
    expect(unstableInstallWarning("/home/uni/.npm/_npx/abc123/node_modules/unicorn/cli.js")).toMatch(/npm install -g unicorn/);
    expect(unstableInstallWarning("/usr/lib/node_modules/unicorn/cli.js")).toBeNull();
    const linux = servicePlan("linux", "/home/uni/.unicorn");
    expect(linux?.installed).toBe("/etc/systemd/system/unicorn.service");
    expect(linux?.activate.join("\n")).toContain("systemctl enable --now unicorn");
    const mac = servicePlan("darwin", "/Users/uni/.unicorn", "/Users/uni");
    expect(mac?.installed).toBe("/Users/uni/Library/LaunchAgents/com.unicorn.serve.plist");
    expect(mac?.activate.join("\n")).toContain("launchctl bootstrap gui/$(id -u)");
    expect(servicePlan("win32", "C:\\x")).toBeNull();
  });

  it("renders Sentinel as a launchd agent on an interval, under its own label, logging outside the data dir", () => {
    const out = "/Users/uni/Library/Application Support/unicorn-sentinel";
    const sentinel = { node: "/usr/bin/node", script: "/usr/lib/node_modules/unicorn/cli.js", dataDir: "/Users/uni/.unicorn", home: "/Users/uni", out };
    expect(sentinelCommand(sentinel)).toEqual(["/usr/bin/node", "/usr/lib/node_modules/unicorn/cli.js", "sentinel", "--once", "--data-dir", "/Users/uni/.unicorn", "--out", out]);
    expect(sentinelCommand({ ...sentinel, script: "/srv/Unicorn/server/unicorn.ts" })[1]).toBe("--experimental-strip-types");
    const plist = sentinelLaunchdPlist(sentinel);
    expect(plist).toContain("<string>com.unicorn.sentinel</string>");
    expect(plist).toContain("<key>StartInterval</key>\n\t<integer>120</integer>");
    expect(plist).toContain("<string>sentinel</string>");
    expect(plist).not.toContain("KeepAlive");
    expect(plist).toContain(`<string>${out}/sentinel.log</string>`);
    expect(plist).not.toContain(".unicorn/logs");
    const mac = sentinelServicePlan("darwin", out, "/Users/uni");
    expect(mac?.files).toEqual([{ name: "com.unicorn.sentinel.plist", installed: "/Users/uni/Library/LaunchAgents/com.unicorn.sentinel.plist" }]);
    // a path with a space is one argument in the printed commands
    expect(mac?.activate[0]).toBe("mkdir -p /Users/uni/Library/LaunchAgents && cp '/Users/uni/Library/Application Support/unicorn-sentinel/com.unicorn.sentinel.plist' /Users/uni/Library/LaunchAgents/com.unicorn.sentinel.plist");
    expect(mac?.deactivate[0]).toBe("launchctl bootout gui/$(id -u)/com.unicorn.sentinel");
  });

  it("renders Sentinel as a systemd user timer, with no root", () => {
    const sentinel = { node: "/usr/bin/node", script: "/usr/lib/node_modules/unicorn/cli.js", dataDir: "/home/uni/My Data", home: "/home/uni", out: "/home/uni/.local/state/unicorn-sentinel" };
    const unit = sentinelSystemdService(sentinel);
    expect(unit).toContain("Type=oneshot");
    expect(unit).toContain('ExecStart=/usr/bin/node /usr/lib/node_modules/unicorn/cli.js sentinel --once --data-dir "/home/uni/My Data" --out /home/uni/.local/state/unicorn-sentinel');
    expect(unit).not.toContain("User=");
    expect(sentinelSystemdTimer()).toContain("OnUnitActiveSec=120s");
    expect(sentinelSystemdTimer()).toContain("WantedBy=timers.target");
    const linux = sentinelServicePlan("linux", sentinel.out, "/home/uni");
    expect(linux?.files.map((file) => file.installed)).toEqual(["/home/uni/.config/systemd/user/unicorn-sentinel.service", "/home/uni/.config/systemd/user/unicorn-sentinel.timer"]);
    expect(linux?.activate[0]).toContain("cp /home/uni/.local/state/unicorn-sentinel/unicorn-sentinel.service");
    expect(linux?.activate.join("\n")).toContain("systemctl --user enable --now unicorn-sentinel.timer");
    expect(linux?.activate.join("\n")).not.toContain("sudo");
    expect(sentinelServicePlan("win32", "C:\\x")).toBeNull();
  });

  it("finds the CLI the installed desktop app ships, and runs it as Node", () => {
    const app = "/Applications/Unicorn.app/Contents";
    const present = new Set([`${app}/MacOS/Unicorn`, `${app}/Resources/server/unicorn.js`]);
    expect(shippedSentinelCli("darwin", "/Users/uni", (path) => present.has(path))).toEqual({ node: `${app}/MacOS/Unicorn`, script: `${app}/Resources/server/unicorn.js` });
    const user = "/Users/uni/Applications/Unicorn.app/Contents";
    expect(shippedSentinelCli("darwin", "/Users/uni", (path) => path.startsWith(user))?.script).toBe(`${user}/Resources/server/unicorn.js`);
    expect(shippedSentinelCli("linux", "/home/uni", (path) => path.startsWith("/opt/Unicorn/"))).toEqual({ node: "/opt/Unicorn/unicorn", script: "/opt/Unicorn/resources/server/unicorn.js" });
    // an app with its script missing, or one released before Sentinel, is no CLI for it
    expect(shippedSentinelCli("darwin", "/Users/uni", (path) => path.endsWith("MacOS/Unicorn"))).toBeNull();
    expect(shippedSentinelCli("darwin", "/Users/uni", (path) => present.has(path), () => false)).toBeNull();
    expect(shippedSentinelCli("win32", "C:\\Users\\uni", () => true)).toBeNull();

    const spec = { node: `${app}/MacOS/Unicorn`, script: `${app}/Resources/server/unicorn.js`, dataDir: "/Users/uni/.unicorn", home: "/Users/uni", out: "/tmp/s", electronRunAsNode: true };
    expect(sentinelLaunchdPlist(spec)).toContain("<key>ELECTRON_RUN_AS_NODE</key>\n\t\t<string>1</string>");
    expect(sentinelSystemdService(spec)).toContain("Environment=ELECTRON_RUN_AS_NODE=1");
    expect(sentinelLaunchdPlist({ ...spec, electronRunAsNode: false })).not.toContain("ELECTRON_RUN_AS_NODE");
  });

  it("keeps every path one quoted value in the systemd unit, and refuses one no unit can hold", () => {
    const spec = { node: "/usr/bin/node", script: "/srv/omb/cli.js", dataDir: "/home/uni/100% $HOME\\", home: "/home/my uni", out: "/home/my uni/.local/state/unicorn-sentinel" };
    const unit = sentinelSystemdService(spec);
    expect(unit).toContain('Environment="HOME=/home/my uni"');
    // % is no specifier, $ no variable, and the trailing backslash no continuation
    expect(unit).toContain('"/home/uni/100%% $$HOME\\\\"');
    expect(sentinelUnitCommand(unit)).toEqual({ node: "/usr/bin/node", script: "/srv/omb/cli.js" });
    expect(sentinelUnitCommand(sentinelSystemdService({ ...spec, script: "/srv/100% $x/cli.js" }))?.script).toBe("/srv/100% $x/cli.js");
    for (const bad of ["/home/uni\n[Service]\nExecStartPre=/bin/true", "/home/uni\r", "/home/\0uni"]) {
      expect(() => sentinelSystemdService({ ...spec, home: bad })).toThrow(/line break or NUL/);
      expect(() => sentinelLaunchdPlist({ ...spec, dataDir: bad })).toThrow(/line break or NUL/);
    }
  });

  it("reads back what an installed unit runs, and calls it stale when either path is gone", () => {
    const spec = { node: "/opt/node & co/bin/node", script: "/srv/omb/cli.js", dataDir: "/home/uni/My Data", home: "/home/uni", out: "/home/uni/.local/state/unicorn-sentinel" };
    expect(sentinelUnitCommand(sentinelLaunchdPlist(spec))).toEqual({ node: "/opt/node & co/bin/node", script: "/srv/omb/cli.js" });
    expect(sentinelUnitCommand(sentinelSystemdService(spec))).toEqual({ node: "/opt/node & co/bin/node", script: "/srv/omb/cli.js" });
    expect(sentinelUnitCommand("[Service]\nType=oneshot\n")).toBeNull();

    const unit = "/home/uni/.config/systemd/user/unicorn-sentinel.service";
    const timer = "/home/uni/.config/systemd/user/unicorn-sentinel.timer";
    const files = new Map([[unit, sentinelSystemdService(spec)]]);
    const fs = (present: string[]) => ({ exists: (path: string) => files.has(path) || present.includes(path), read: (path: string) => files.get(path)! });
    expect(checkSentinelInstall("linux", "/home/uni", fs([spec.node, spec.script, timer]))).toMatchObject({ status: "ok", unit });
    expect(checkSentinelInstall("linux", "/home/uni", fs([spec.node, timer]))).toMatchObject({ status: "stale", missing: ["/srv/omb/cli.js"] });
    // the service without its timer never runs
    expect(checkSentinelInstall("linux", "/home/uni", fs([spec.node, spec.script]))).toMatchObject({ status: "stale", missing: [timer] });
    expect(checkSentinelInstall("darwin", "/Users/uni", fs([]))).toEqual({ status: "not_installed", unit: "/Users/uni/Library/LaunchAgents/com.unicorn.sentinel.plist" });
    files.set(unit, "garbage");
    expect(checkSentinelInstall("linux", "/home/uni", fs([]))).toEqual({ status: "unreadable", unit });
    expect(checkSentinelInstall("win32", "C:\\Users\\uni", fs([]))).toEqual({ status: "unsupported" });
  });
});
