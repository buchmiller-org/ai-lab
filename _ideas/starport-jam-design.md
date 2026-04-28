# Starport Jam — Game Concept

**Genre:** Puzzle / Sorting ("Jam" mechanic)  
**Setting:** Sci-Fi spaceport, bright flat-cartoon aesthetic  
**Match Length:** 2-5 minutes per level  
**Art:** 2D flat cartoon style, matte colors, clean UI  

---

## The Game

The player acts as a cargo dispatcher at a busy interstellar spaceport. The central board features a dense cluster of colorful "Cargo Pods" magnetically locked together. Instead of forming recognizable pictures, the pods are arranged in interesting geometric patterns (e.g., spirals, concentric rings, interlocking stripes). The goal is to dismantle the entire cluster by loading the pods into matching-colored Freight Shuttles. If your Landing Pads fill up with shuttles that cannot be loaded, the spaceport suffers a gridlock and the level is lost.

## Core Mechanics

- **The Cargo Cluster:** Pods are arranged in a central grid. Pods can be extracted by shuttles using tractor beams. Usually, only "exposed" outer pods can be extracted, meaning players have to peel away the outer layers before reaching the inner colors.
- **The Perimeter Track:** A square flight path or track that borders the central Cargo Cluster. When shuttles are actively loading pods, they travel along this track.
- **Freight Shuttles (The Deck):** At the bottom of the screen is your dispatch queue. Each shuttle requires a specific color of cargo and has a capacity limit (e.g., 10, 14, 40 pods). 
- **Landing Pads:** A staging area with a limited number of landing pads (e.g., 5). When the player taps a shuttle from the dispatch queue, it docks at an empty landing pad.
- **Loading & Launching:** When the player taps a shuttle parked on a landing pad, it moves onto the active Perimeter Track. It travels around the track exactly one time, using its tractor beam to vacuum up any matching pods. If its cargo hold becomes full during this lap, the shuttle launches into hyperspace, freeing up its landing pad and revealing new pods. If it completes the lap without filling up, it simply parks back on its landing pad to wait until the player taps it again.

## Win/Loss Conditions & Difficulty

- **Win:** Clear all cargo pods from the central cluster.
- **Loss:** Fill all landing pads with shuttles that cannot currently extract any pods (because their required colors are buried in the cluster), resulting in a gridlock.
- **Difficulty Selection:** The player chooses their desired difficulty before each match (e.g., Easy, Medium, Hard). Higher difficulties feature more pod colors and larger, denser clusters that require more careful planning to untangle. The specific layout of pods is algorithmically generated for infinite replayability at any chosen difficulty.

## Strategy & Agency

- **Player Agency:** The player decides *which* shuttle to call down from the dispatch queue to the landing pads, and *when* to deploy a parked shuttle from the landing pad onto the Perimeter Track.
- **Strategy:** The player must carefully observe the outer layers of the cargo cluster. Calling down a red shuttle when only blue pods are exposed will clog up a landing pad. The challenge is managing the limited pads while "mining" into the cluster to reach the colors you need.

## Asset Requirements (For User)

To bring this cartoon-style spaceport to life, we'll need a few distinct 2D assets:
- **Cargo Pods:** Simple, square or hex-shaped crates with a slight cartoon bevel or rivet details. Need variations in 5-6 matte colors (e.g., rust red, mustard yellow, mint green, sky blue, plum purple).
- **Freight Shuttle:** A chunky, flat-cartoon spaceship. It needs a color-tintable hull or colored cargo containers to indicate which pod color it accepts.
- **UI Elements:** A sleek but friendly "Landing Pad" slot graphic, a capacity tag/label for the shuttles, and a simple spaceport floor background.

## Why It's Engaging

This style of game relies on the tactile satisfaction of "cleaning up" a board. The visual reward of slowly dismantling a complex, colorful pattern pairs perfectly with the logical puzzle of managing the staging slots. The flat cartoon style will keep the screen readable and visually relaxing, even when there are hundreds of pods on the board.
