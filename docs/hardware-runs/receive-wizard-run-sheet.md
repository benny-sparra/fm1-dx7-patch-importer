# Receive patches wizard: step-by-step checks

For PR #364, on the orange FM1 (stock V16). Tick each step as you go.

## Before you start

1. Connect the orange FM1 to the Mac with USB.
2. Open the editor from a dev server running this PR's branch, not `main`'s.
3. Leave **MIDI offline** for now.

## Test 1: receive a bank from the FM1

1. Click **⋮** beside the search box, then **Receive from the FM1…**.
   - [ ] A window called **Receive patches** opens.
   - [ ] **An FM1 on M-VAVE's V16** is already chosen.
2. Click **Next**.
   - [ ] It shows a **Switch MIDI online** button.
3. Click **Switch MIDI online**.
   - [ ] It says **Listening on "…"** and tells you to open GLOBE on the FM1.
4. On the FM1, press **GLOBE**, choose **Export**, and pick a bank.
   - [ ] The editor says it received a bank of 32 patches.
5. Click **Next**.
   - [ ] You see 32 patches. Click a couple, and each one plays on the FM1.
6. Click **Next**.
   - [ ] A bank is chosen, and a yellow warning says what will be replaced.
7. Click **Replace**.
   - [ ] The window closes, and a message offers **Undo**.
8. Click **Undo**.
   - [ ] The bank goes back to how it was.
9. Click **MIDI log** and look at what was sent.
   - [ ] The only messages sent are an identity query when MIDI went online, and the patches you
         clicked in step 5. Nothing is sent while listening, receiving, or replacing.

## Test 2: start Export too early

1. Open **Receive from the FM1…** again, but don't click **Next**.
2. On the FM1, start **Export**.
   - [ ] After a while the FM1 says **Receive Timeout**.
3. In the editor, click **Next**. Then start **Export** on the FM1 again.
   - [ ] The bank arrives, without turning the FM1 off and on.

## Test 3: receive one patch (optional)

Needs a program that sends one DX7 patch, such as Dexed. Skip it without one: the FM1 plays no
part, and the automated tests cover this path.

1. Click **⋮** on any patch, then **Receive patch…**.
   - [ ] **One patch from another device** is already chosen.
2. Click **Next**. Send one patch from Dexed.
   - [ ] The editor names the patch it received.
3. Click **Next**, then **Next** again.
   - [ ] The slot you started from is already chosen.
4. Click **Replace**, then **Undo** in the message.
   - [ ] The slot goes back to its old patch.

## Test 4: the other menu item

1. Click **⋮** on a bank in the list on the left.
   - [ ] **Receive from the FM1…** is in the menu.
2. Open it, then click the **X** to close.
   - [ ] You're back on that bank's **⋮**.

## Test 5: phone size (optional)

1. Make the window as narrow as a phone.
2. Open **Receive from the FM1…** and click through the steps.
   - [ ] Everything fits, and **Back** and **Next** stay at the bottom.
