import AppKit
import SwiftUI

@main
struct GoatBarApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @StateObject private var store = Store()

    var body: some Scene {
        MenuBarExtra {
            ChatList(store: store)
        } label: {
            BarLabel(store: store)
        }
        .menuBarExtraStyle(.window)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Only one copy: a second launch of the bundled app quits.
        if let id = Bundle.main.bundleIdentifier,
           NSRunningApplication.runningApplications(withBundleIdentifier: id).count > 1 {
            NSApp.terminate(nil)
            return
        }
        NSApp.setActivationPolicy(.accessory) // no Dock icon, also under `swift run`
    }
}

// ---- colours ------------------------------------------------------------------------

enum Palette {
    // Claude Code's /color names, in the order the Windows app hashes into.
    static let chatNames = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"]
    static let chatColors: [String: UInt32] = [
        "red": 0xF02D2D, "orange": 0xFF7A1A, "yellow": 0xFFD000, "green": 0x22E05A,
        "cyan": 0x00D8F5, "blue": 0x3B82FF, "purple": 0xB455FF, "pink": 0xF06BB8,
    ]
    // Square fill = status.
    static let fillHex: [String: UInt32] = [
        "working": 0xA77B35, // dull orange: busy, no need to look
        "waiting": 0x38845C, // green: done, your turn
        "seen": 0x2A5A3F,    // dim green: done, you've looked
        "asking": 0x2F6FC8,  // blue: needs an answer
        "idle": 0x5A5A5A,
    ]

    static func ns(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
        NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                blue: CGFloat(hex & 0xFF) / 255, alpha: alpha)
    }

    /// The chat's colour: its /color if it has one, else a fixed pick from FNV-1a of "tool-sid"
    /// (same UTF-16 hash as the Windows app, so a chat gets the same colour on both).
    static func chatHex(_ s: Session) -> UInt32 {
        if let hex = chatColors[s.color] { return hex }
        var h: UInt32 = 2166136261
        for u in s.key.utf16 { h = (h ^ UInt32(u)) &* 16777619 }
        return chatColors[chatNames[Int(h % UInt32(chatNames.count))]] ?? 0x888888
    }

    static func fill(_ state: String) -> NSColor { ns(fillHex[state] ?? 0x5A5A5A) }
    static let logo = ns(0xFFFFFF, 0.92)
}

// ---- menu bar image -----------------------------------------------------------------

/// One small rounded square per chat: fill = status, border = chat colour, tool logo inside.
/// Idle chats shrink to a short bar along the bottom, like on Windows.
enum BarImage {
    static let side: CGFloat = 16, gap: CGFloat = 4, height: CGFloat = 18

    static let maxSquares = 8 // a wider item can be dropped behind the notch

    static func render(_ all: [Session], _ states: [String: String]) -> NSImage {
        let side = BarImage.side, gap = BarImage.gap, height = BarImage.height
        let sessions = Array(all.prefix(maxSquares))
        let overflow = all.count - sessions.count
        let n = CGFloat(max(sessions.count, 1)) + (overflow > 0 ? 0.75 : 0)
        let size = NSSize(width: n * side + (n - 1) * gap, height: height)
        let image = NSImage(size: size, flipped: true) { _ in
            guard let ctx = NSGraphicsContext.current?.cgContext else { return false }
            for (i, s) in sessions.enumerated() {
                let x = CGFloat(i) * (side + gap)
                let chat = Palette.ns(Palette.chatHex(s))
                let state = states[s.key] ?? s.state
                if state == "idle" {
                    let bar = CGRect(x: x + 1, y: height - 5, width: side - 2, height: 4)
                    ctx.addPath(CGPath(roundedRect: bar, cornerWidth: 1.5, cornerHeight: 1.5, transform: nil))
                    ctx.setFillColor(chat.withAlphaComponent(0.6).cgColor)
                    ctx.fillPath()
                    continue
                }
                let top = (height - side) / 2
                let box = CGRect(x: x + 0.75, y: top + 0.75, width: side - 1.5, height: side - 1.5)
                let shape = CGPath(roundedRect: box, cornerWidth: 4, cornerHeight: 4, transform: nil)
                ctx.addPath(shape)
                ctx.setFillColor(Palette.fill(state).cgColor)
                ctx.fillPath()
                ctx.addPath(shape)
                ctx.setStrokeColor(chat.cgColor)
                ctx.setLineWidth(1.5)
                ctx.strokePath()

                let logo: CGFloat = 9
                var t = CGAffineTransform(translationX: x + (side - logo) / 2, y: top + (side - logo) / 2)
                    .scaledBy(x: logo / 24, y: logo / 24)
                if let path = Icons.path(for: s.tool).copy(using: &t) {
                    ctx.addPath(path)
                    ctx.setFillColor(Palette.logo.cgColor)
                    ctx.fillPath()
                }
            }
            if overflow > 0 { // three dots standing in for the chats that didn't fit
                let x = CGFloat(sessions.count) * (side + gap)
                ctx.setFillColor(Palette.ns(0xFFFFFF, 0.55).cgColor)
                for d in 0..<3 {
                    ctx.addEllipse(in: CGRect(x: x + CGFloat(d) * 4, y: height / 2 - 1, width: 2, height: 2))
                }
                ctx.fillPath()
            }
            return true
        }
        image.isTemplate = false // keep the colours; a template image would be drawn monochrome
        return image
    }
}

struct BarLabel: View {
    @ObservedObject var store: Store

    var body: some View {
        if store.sessions.isEmpty {
            Image(systemName: "square.dashed")
        } else {
            Image(nsImage: store.barImage).renderingMode(.original)
        }
    }
}

// ---- dropdown -----------------------------------------------------------------------

struct ChatList: View {
    @ObservedObject var store: Store

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(store.summary)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.secondary)
                .padding(.horizontal, 14)
                .padding(.top, 10)
                .padding(.bottom, 6)

            if store.sessions.isEmpty {
                Text("No Claude Code or Codex chats are running.")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 14)
                    .padding(.bottom, 8)
            } else if store.sessions.count > 7 {
                ScrollView { rows }.frame(height: 440)
            } else {
                rows
            }

            Divider().padding(.vertical, 4)
            MenuRow(title: "Mark all finished as seen") { store.markAllSeen() }
            MenuRow(title: "Quit GoatBar") { NSApp.terminate(nil) }
        }
        .padding(.bottom, 6)
        .frame(width: 340)
    }

    private var rows: some View {
        VStack(spacing: 2) {
            ForEach(store.sessions, id: \.key) { s in
                ChatRow(session: s, state: store.state(of: s), now: store.now) { store.select(s) }
            }
        }
        .padding(.horizontal, 5)
    }
}

struct ChatRow: View {
    let session: Session
    let state: String
    let now: Date
    let action: () -> Void
    @State private var hover = false

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 10) {
                ChatSquare(session: session, state: state)
                    .frame(width: 22, height: 22)
                    .padding(.top, 1)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 13, weight: .semibold))
                        .lineLimit(2)
                    Text("\(session.tool == "claude" ? "Claude Code" : "Codex")  ·  \(folder)")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    HStack(spacing: 6) {
                        Circle().fill(Color(nsColor: Palette.fill(state))).frame(width: 7, height: 7)
                        Text(status).font(.system(size: 11))
                    }
                    if !session.step.isEmpty {
                        Text("› " + session.step)
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 7)
            .background(RoundedRectangle(cornerRadius: 6).fill(Color.primary.opacity(hover ? 0.08 : 0)))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .help(session.cwd)
    }

    private var folder: String { (session.cwd as NSString).lastPathComponent }
    private var title: String { session.name.isEmpty ? folder : session.name }

    private var status: String {
        let ago = Int64(now.timeIntervalSince1970 * 1000) - session.since
        switch state {
        case "working": return "Working · \(elapsed(ago))"
        case "waiting": return "Finished \(elapsed(ago)) ago · waiting on you"
        case "seen": return "Finished \(elapsed(ago)) ago"
        case "asking": return "Needs your answer"
        default: return session.since > 0 ? "Idle · last active \(elapsed(ago)) ago" : "Idle"
        }
    }

    private func elapsed(_ ms: Int64) -> String {
        let m = max(0, ms) / 60000
        if m < 1 { return "<1m" }
        if m < 60 { return "\(m)m" }
        if m < 1440 { return "\(m / 60)h \(m % 60)m" }
        return "\(m / 1440)d \(m % 1440 / 60)h"
    }
}

struct ChatSquare: View {
    let session: Session
    let state: String

    var body: some View {
        let idle = state == "idle"
        ZStack {
            RoundedRectangle(cornerRadius: 5)
                .fill(Color(nsColor: Palette.fill(state)).opacity(idle ? 0.45 : 1))
            RoundedRectangle(cornerRadius: 5)
                .strokeBorder(Color(nsColor: Palette.ns(Palette.chatHex(session))).opacity(idle ? 0.45 : 1), lineWidth: 2)
            LogoShape(tool: session.tool)
                .fill(Color(nsColor: Palette.logo))
                .frame(width: 12, height: 12)
                .opacity(idle ? 0.6 : 1)
        }
    }
}

struct LogoShape: Shape {
    let tool: String

    func path(in rect: CGRect) -> Path {
        let t = CGAffineTransform(translationX: rect.minX, y: rect.minY)
            .scaledBy(x: rect.width / 24, y: rect.height / 24)
        return Path(Icons.path(for: tool)).applying(t)
    }
}

struct MenuRow: View {
    let title: String
    let action: () -> Void
    @State private var hover = false

    var body: some View {
        Button(action: action) {
            HStack {
                Text(title).font(.system(size: 13))
                Spacer()
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(RoundedRectangle(cornerRadius: 5).fill(Color.primary.opacity(hover ? 0.08 : 0)))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .padding(.horizontal, 5)
    }
}
