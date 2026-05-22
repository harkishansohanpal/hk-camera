# HK Camera For Dummies

**By Harkishan "I Break Things" Sohanpal &mdash; and probably you**

---

## About This Book

You bought (or built) a camera system. Now what? This book assumes you know how to turn on a phone and&mdash;this is a stretch&mdash;use a web browser. Everything else is gravy.

---

## Part I: What Even Is This?

### Chapter 1: HK Camera in 30 Seconds

HK Camera turns an old phone into a security camera. Point it at something. Watch it from somewhere else. That's it.

**You are here:** Because someone said "we need cameras" and you got voluntold.

**What you will need:**
- A phone that still works (cracked screen: fine. Water damage: less fine.)
- Wi-Fi (the camera streams video, not vibes)
- The patience of a minor deity

### Chapter 2: The Players

| Person | What They Do |
|--------|-------------|
| **You (The Viewer)** | Sit on a couch, watch the feed, feel like James Bond |
| **The Camera Phone** | Sits in a corner, gets dusty, judges you |
| **The Server** | A computer somewhere (maybe in the cloud, maybe in your closet) that passes video between the camera and you |
| **Harkishan** | Wrote the code. Blame him. |

> **Warning:** If the server goes down, your camera is just a very expensive paperweight. Keep the server alive. Feed it. Water it. Give it a name.

---

## Part II: Setting Things Up (Without Crying)

### Chapter 3: Making an Account

1. Go to the website.
2. Click **Register**.
3. Type your email. Type a password. **Write the password down.** (Everyone forgets. Everyone.)
4. Check the box that says you read the Privacy Policy. (You didn't. That's fine. We didn't either.)
5. Click Register.
6. Check your email. Click the link. (Or don't, if we forgot to implement email verification. Check GitHub.)

> **Remember:** Your password is like your toothbrush. Don't share it. Change it every few months. Don't use the one from your email.

### Chapter 4: Adding a Camera

1. Log in.
2. Click **Add Camera**.
3. Give it a name like "Front Door" or "That Spot The Dog Keeps Digging Up".
4. Click Create.
5. A magic string of letters and numbers appears. This is your **Stream Key**. It's like a secret handshake for your camera.
6. **WRITE THIS DOWN.** You will need it.

> **Technical Stuff:** The stream key is a UUID. It's 32 characters of hexadecimal. It looks like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`. If you lose it, you can rotate it from the settings page. The old one stops working instantly. Use this power wisely.

### Chapter 5: Going Live

1. Open the camera page on your phone.
2. Point the camera at something interesting. (A plant. A door. Your cat. Your cat judging you.)
3. Tap **Go Live**.
4. The button turns red and starts pulsing. This means it's working. (Or it's about to explode. 50/50.)

> **Tip:** If the button stays gray, check:
> - Is Wi-Fi on? (Yes, we know you checked. Check again.)
> - Is the camera not being used by another app? (Close TikTok.)
> - Did you grant camera permissions? (iOS will ask. Say yes.)

---

## Part III: Watching

### Chapter 6: Viewing Your Camera

1. Open the Dashboard on any device.
2. Look for the green **Live** badge next to your camera.
3. If it's green, click **View Live**.
4. If it's gray, your camera is offline. Go poke it.

> **Remember:** Green = good. Gray = go poke it.

### Chapter 7: The Viewer Experience

When you click View Live, several things happen in the span of a few seconds:

1. Your browser nervously asks the server "is the camera there?"
2. The server says "yeah, hold on"
3. Your browser and the camera do a little dance called **WebRTC handshake**
4. If they agree on how to talk (codecs, bitrate, whose turn it is to buy coffee), video appears

**Status messages you might see:**

| Message | Translation |
|---------|-------------|
| `connecting` | "I'm trying, geez" |
| `waiting` | "Camera is asleep. Wake it up." |
| `connected` | "We have video! Stop panicking." |
| `disconnected` | "Something broke. Try again." |
| `error` | "Something really broke. Maybe check the server?" |

> **Warning:** If you see `disconnected` or `error`, don't panic. Click **Retry Now**. If that doesn't work, refresh the page. If that doesn't work, restart the camera. If that doesn't work, restart the server. If that doesn't work, take a walk and try again later.

### Chapter 8: Why Does It Say "Waiting" and Never Change?

Ah, you've found the classic. Here's the diagnosis tree:

1. **Did the camera stop broadcasting?** Go check the camera page. Is the red "Go Live" button still red? If not, tap it.
2. **Did the server restart?** Yes, we know. The viewer gets stuck. This is a known issue. We're working on it. (Actually, we just pushed a fix for this exact thing. Update your deployment.)
3. **Is your Wi-Fi having an existential crisis?** Unplug your router. Count to 10. Plug it back in. This fixes approximately 73% of all problems.
4. **Did you open the viewer before the camera started?** The viewer joins a room. If the camera isn't there yet, it waits. The camera eventually broadcasts "I'm here!" and the viewer should jump on it. If it doesn't... see point 2.

---

## Part IV: Advanced Moves (For People Who Read Manuals)

### Chapter 9: Two-Way Audio

You can talk through the camera. The person on the other end can hear you. This is great for:
- Telling the delivery person where to leave the package
- Telling your dog to get off the couch
- Freaking out your cat

> **Warning:** Some states require both parties to consent to audio recording. That's between you and your lawyer. We just move the bits. See our Terms of Service for the scary legal text.

### Chapter 10: Motion Detection

The camera can detect things moving in front of it. It uses one of two methods:

**Pixel-Diff Mode:** Compares pixels between frames. Something changed? Motion detected. Simple. Works on everything. Can be fooled by trees, shadows, and your cat walking past.

**ML Mode (YOLOv8):** Uses artificial intelligence to detect actual people, animals, and vehicles. Smarter. Doesn't trigger on every leaf blowing in the wind. Requires a modern phone. May take a few seconds to load the model on the first run.

> **Technical Stuff:** YOLOv8 runs entirely on your phone. No video is sent to the cloud for analysis. We don't see what your camera sees. We couldn't even if we wanted to. (We don't want to. We have enough problems.)

### Chapter 11: Night Vision

Three modes:

| Mode | How It Works | Best For |
|------|-------------|----------|
| Off | Normal vision in the dark | Nothing. It's dark. |
| Enhanced | Brightens the existing image | Dimly lit rooms |
| IR (Android only) | Uses Camera2 API to boost ISO and exposure | Pitch black |

> **Technical Stuff:** IR mode uses the Camera2 API on Android devices. It cranks the ISO to 1600 and the exposure to 66ms. The result looks like a 90s camcorder. You can almost hear the static.

---

## Part V: When Things Go Wrong

### Chapter 12: The Camera Won't Start

**Symptoms:** You tap "Go Live" and nothing happens. The button stays gray.

**Causes and cures:**

1. **No camera permission.** iOS: Settings > HK Camera > Camera > ON. Android: Settings > Apps > HK Camera > Permissions > Camera > ON.
2. **Camera already in use.** Close other apps that might be using the camera. (Yes, that includes FaceTime.)
3. **The web page doesn't support HTTP.** Camera access requires HTTPS (or localhost). If you're visiting over plain HTTP, the browser will refuse. This is a security feature, not a bug.
4. **You're on a phone that HATES JavaScript.** Some older browsers don't support `getUserMedia`. Upgrade your browser or your phone. (Or both.)

### Chapter 13: The Video Is Laggy

**Symptoms:** Video is choppy, pixelated, or 5 seconds behind reality.

**Causes and cures:**

1. **Wi-Fi is weak.** Move the camera closer to the router. Or move the router closer to the camera. (Pro tip: moving the camera is easier.)
2. **Too many devices on the network.** Someone is streaming 4K Netflix. Tell them to stop. (They won't.)
3. **The server is far away.** If your server is in Virginia and you're in Australia, there's a 200ms round trip. The video has to travel through many tubes. Be patient.
4. **Too many viewers.** Each viewer adds load. If you have 50 people watching your front door, something is wrong with your life choices.

### Chapter 14: The Button Went Red But Nobody Can See It

**Symptoms:** The camera says "Live" but the Dashboard says "Offline."

**Diagnosis:** The Dashboard doesn't use sockets. It uses REST. It fetched the camera list when the page loaded. If the camera went live after that, the Dashboard doesn't know about it.

**Fix:** We actually just deployed a fix for this. The Dashboard now opens a socket connection and listens for `camera:online` events. But if you're reading the OLD version of this document because you haven't updated your deployment:

> **Tip:** Refresh the Dashboard page. It's not elegant, but it works.

### Chapter 15: The Viewer Shows "Waiting" Forever After A Camera Restart

**Symptoms:** Camera was streaming. Camera stopped. Camera started again. Viewer is stuck on "waiting."

**Diagnosis:** This was a real bug. The viewer's reconnection logic had a guard that checked "is an offer already in flight?" If the answer was yes (because a previous offer attempt never completed), it silently skipped reconnection forever.

**Fix:** We fixed it. The viewer now always resets stale state and retries when the camera comes back online.

> **Remember:** If this happens AFTER our fix, you might be running old code. Re-deploy. If it still happens, file a GitHub issue and @ Harkishan. He'll probably fix it before morning coffee.

---

## Part VI: The Legal Stuff (Boring But Important)

### Chapter 16: Privacy

- Cameras record video. You control what they see.
- Video is NOT sent to us. It goes directly from your phone to your viewer's browser. The server only helps set up the connection.
- If you enable motion alerts, a thumbnail is sent to our server so we can notify you. That's it.
- We use cookies. Essential ones for the site to work. Non-essential ones (theme preference, tour state) only with your consent.
- If you're in Europe, the GDPR stuff applies. See our Privacy Policy. (The real one, in `Privacy.jsx`, not this funny document.)

### Chapter 17: Audio Recording Laws

This is not legal advice. This is a friendly heads-up:

- **11 US states** require all parties to consent to audio recording: California, Connecticut, Florida, Illinois, Maryland, Massachusetts, Michigan, Montana, New Hampshire, Oregon, Pennsylvania, and Washington. (Yes, we know that's 12. Two-party consent states disagree on who's included.)
- If you enable the microphone on your camera, it's YOUR responsibility to know the laws in your area.
- We show a warning modal the first time you toggle the mic. We can't stop you from breaking the law, but we can say "we told you so."

### Chapter 18: DMCA

If someone's copyrighted content appears in your camera feed and they want it taken down:
- Email our designated agent at `dmca@hkcamera.app`
- Include: your contact info, a description of the work, the specific recording URL, a statement of good faith belief, and your signature (electronic is fine)
- We'll take it down and terminate repeat infringers

> **Warning:** Filing a false DMCA notice is perjury. Don't do it. Karma is real.

---

## Part VII: Appendices

### Appendix A: The Keyboard Shortcut You'll Actually Use

| Action | Shortcut |
|--------|----------|
| Refresh the page | `Cmd/Ctrl + R` |
| Fix everything | See Appendix B |

### Appendix B: The Universal Fix

1. Refresh the page.
2. Wait 10 seconds.
3. If still broken, restart the camera.
4. If still broken, restart the server.
5. If still broken, restart the router.
6. If still broken, restart yourself. (Go outside. Touch grass. Come back.)

### Appendix C: Glossary

| Term | Meaning |
|------|---------|
| **WebRTC** | A way for browsers to talk to each other without a middleman. Magic, basically. |
| **Stream Key** | A secret key that proves your camera is YOUR camera. Guard it with your life. (Or at least don't post it on GitHub.) |
| **TURN Server** | A helper that relays video when direct connections fail. Like a chaperone for data packets. |
| **STUN Server** | A helper that figures out how two devices can talk directly. Less useful than TURN when firewalls are involved. |
| **Codec** | The language video speaks. VP9, H.264, etc. Like English vs Spanish, but for cameras. |
| **ICE Candidate** | A proposed way for two devices to connect. Like giving someone your address, except the address keeps changing. |
| **Offer/Answer** | The WebRTC handshake. "Here's how I want to connect." "OK, here's how I accept." |
| **YOLOv8** | "You Only Look Once, version 8." An AI model that detects objects in images. Not nearly as fun as it sounds. |

### Appendix D: About the Author

**Harkishan Sohanpal** wrote this code because existing camera solutions were either:
- Too expensive
- Too complicated
- Too subscription-based
- Too creepy (looking at you, cloud-based AI analysis of everything)

He has since spent approximately 4,000 hours debugging WebRTC, writing migration scripts, and adding GDPR consent banners. He regrets nothing. (He regrets everything.)

---

## Index

- Adding a camera, 4
- Audio consent, 17, 9
- Camera won't start, 12
- Dashboard not updating, 14
- Fixes, universal, Appendix B
- Glossary, Appendix C
- Going live, 5
- Legal stuff, 16-18
- Motion detection, 10
- Night vision, 11
- Privacy policy, 16
- Streaming issues, 13
- Viewer stuck on waiting, 15, 8
- WebRTC explained, Appendix C
- YOLOv8, 10, Appendix C

---

*"For Dummies" is a trademark of John Wiley & Sons, Inc. We are not affiliated. We just like the format. Please don't sue us. We're developers, we have no money.*
