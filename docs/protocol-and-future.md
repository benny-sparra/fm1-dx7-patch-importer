# FM1 protocol research and future development

The repository records the evidence behind FM1-specific behaviour in
[the FM1 research notes](fm1-research.md). The live effect controls use the documented
24-controller FM1 effects block, with their supported ranges enforced by the editor. The internal
sequencer is being researched through captured fixtures only; it is not yet exposed in the app and
the editor does not send sequencer or other unclassified vendor commands. The one updater message it
sends is the read-only identity query, to tell M-VAVE's firmware from FM-1+VA; the notes record how
the editor was tested on FM-1+VA and why it sends that firmware patches as parameter changes. Of
FM-1+VA's own commands it sends only the read of a stored preset, which changes nothing, and the
write of one, which **Write patches to the FM1…** sends after naming every preset it replaces,
reading each back to confirm it.

## Future development

Future development could add grouped modulation workflows, a focused internal-sequencer editor once
its protocol is proven safe, and device readback if M-VAVE documents a compatible transmit protocol.
FM-1+VA also offers direct sequencer pattern transfer through a command of its own, which could
support editing its Sequencer, and its preset write could carry back the Virtual Analog presets the
library now keeps, each once reviewed and approved.
