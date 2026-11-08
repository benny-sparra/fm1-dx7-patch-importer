import CoreMIDI
import Foundation

// Run-sheet sender for the SMK-37: sends to "SMK-37 Pro-Private" (or the port named by SMK_PORT)
// only, and only standard channel messages, Yamaha (F0 43) SysEx, or two fixed read-only requests.
// Prints every sent message and everything the SMK sends back.
//   note <ch 1-16> <note> [ms]   pc <ch> <program 0-127>   cc <ch> <cc> <value>
//   sysex <hex bytes F0 43 … F7>  syxfile <path>          listen <seconds>
//   sweep <note> <ms>  (one note on each channel 1–16, ms apart)
//   identity   the editor's fm1IdentityQuery, exactly
//   oo-info    Official Open's command 0, info, token 1 (makeOfficialOpenInfoRequest(1)), exactly
//   ports      list the MIDI sources and destinations, send nothing
func name(_ e: MIDIEndpointRef) -> String {
  var v: Unmanaged<CFString>?
  MIDIObjectGetStringProperty(e, kMIDIPropertyDisplayName, &v)
  return (v?.takeRetainedValue() as String? ?? "?").trimmingCharacters(in: .whitespaces)
}
func hex(_ b: [UInt8]) -> String { b.map { String(format: "%02X", $0) }.joined(separator: " ") }

var client = MIDIClientRef(), inPort = MIDIPortRef(), outPort = MIDIPortRef()
MIDIClientCreateWithBlock("smk-run" as CFString, &client, nil)
MIDIInputPortCreateWithBlock(client, "in" as CFString, &inPort) { list, _ in
  for p in list.unsafeSequence() {
    let b = withUnsafeBytes(of: p.pointee.data) { Array($0.prefix(Int(p.pointee.length))) }
    if b.first == 0xF8 || b.first == 0xFE { continue }
    print("in:", b.count > 48 ? "\(hex(Array(b.prefix(24)))) … (\(b.count) bytes)" : hex(b))
  }
}
MIDIOutputPortCreate(client, "out" as CFString, &outPort)
for i in 0..<MIDIGetNumberOfSources() where name(MIDIGetSource(i)).contains("SMK") {
  MIDIPortConnectSource(inPort, MIDIGetSource(i), nil)
}
if CommandLine.arguments.dropFirst().first == "ports" {
  for i in 0..<MIDIGetNumberOfSources() { print("source:", name(MIDIGetSource(i))) }
  for i in 0..<MIDIGetNumberOfDestinations() { print("destination:", name(MIDIGetDestination(i))) }
  exit(0)
}
let portName = ProcessInfo.processInfo.environment["SMK_PORT"] ?? "SMK-37 Pro-Private"
guard let dest = (0..<MIDIGetNumberOfDestinations()).map(MIDIGetDestination)
  .first(where: { name($0) == portName }) else { fatalError("No \(portName)") }

func send(_ b: [UInt8]) {
  let size = b.count + 64
  var buf = [UInt8](repeating: 0, count: size)
  buf.withUnsafeMutableBytes { raw in
    let list = raw.baseAddress!.assumingMemoryBound(to: MIDIPacketList.self)
    let p = MIDIPacketListInit(list)
    MIDIPacketListAdd(list, size, p, 0, b.count, b)
    let status = MIDISend(outPort, dest, list)
    print("out:", b.count > 48 ? "\(hex(Array(b.prefix(24)))) … (\(b.count) bytes)" : hex(b), status == 0 ? "" : "status \(status)")
  }
}
func wait(_ ms: Int) { RunLoop.main.run(until: Date().addingTimeInterval(Double(ms) / 1000)) }
func int(_ s: String, _ lo: Int, _ hi: Int) -> Int {
  guard let v = Int(s), v >= lo, v <= hi else { fatalError("\(s) not in \(lo)…\(hi)") }
  return v
}
func note(_ ch: Int, _ n: Int, _ ms: Int) {
  send([UInt8(0x90 + ch - 1), UInt8(n), 100]); wait(ms); send([UInt8(0x80 + ch - 1), UInt8(n), 0])
}
func checkYamaha(_ b: [UInt8]) {
  guard b.count >= 4, b.first == 0xF0, b[1] == 0x43, b.last == 0xF7,
        b.dropFirst().dropLast().allSatisfy({ $0 < 0x80 }) else { fatalError("Not Yamaha SysEx") }
}

let a = Array(CommandLine.arguments.dropFirst())
switch a.first {
case "note": note(int(a[1], 1, 16), int(a[2], 0, 127), a.count > 3 ? int(a[3], 1, 10000) : 600)
case "sweep": for ch in 1...16 { print("channel \(ch)"); note(ch, int(a[1], 0, 127), int(a[2], 100, 5000)); wait(400) }
case "pc": send([UInt8(0xC0 + int(a[1], 1, 16) - 1), UInt8(int(a[2], 0, 127))])
case "cc": send([UInt8(0xB0 + int(a[1], 1, 16) - 1), UInt8(int(a[2], 0, 119)), UInt8(int(a[3], 0, 127))])
case "sysex":
  let b = a.dropFirst().map { UInt8($0, radix: 16)! }; checkYamaha(b); send(b)
case "syxfile":
  let b = [UInt8](try! Data(contentsOf: URL(fileURLWithPath: a[1]))); checkYamaha(b); send(b)
case "identity": send([0xF0, 0x00, 0x32, 0x45, 0x00, 0x00, 0x00, 0x40, 0x7F, 0xF7])
case "oo-info": send([0xF0, 0x7D, 0x46, 0x4D, 0x02, 0x00, 0x01, 0x00, 0x6D, 0xF7])
case "listen": break
default: fatalError("unknown command")
}
wait(a.first == "listen" ? int(a[1], 1, 600) * 1000 : 1500)
