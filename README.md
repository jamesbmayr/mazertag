# MAZERTAG
MazerTag is a multiplayer top-down arcade game by James Mayr

---

## GAME MODES
* <b>classic tag</b>: one player is "it" and must bump or zap another player
* <b>team freeze tag</b>: bump and zap players to freeze opponents and unfreeze allies
* <b>capture the hat</b>: find and keep the hat to win; whoever wears it has no laser
* <b>team battle</b>: bump and zap opponents back to their spawn to rack up points
* <b>collect the orbs</b>: fight other teams over randomly generated orbs


## ARENA COMPONENTS
* <b>walls</b>: block laser and movement
* <b>windows</b>: block movement
* <b>mirrors</b>: reflect laser and block movement
* <b>obstacles</b>: block laser and movement, can be moved
* <b>teleporters</b>: change player position to another teleporter


## PLAYER ATTRIBUTES
* <b>speed</b>: your acceleration and top velocity
* <b>strength</b>: how far you push obstacles and how much damage you do bumping opponents
* <b>laser</b>: the damage dealt from your laser and how well it holds up from reflections
* <b>recovery</b>: how quickly your energy recharges from lasers and bumping
* <b>vision</b>: how far you can see in all directions


## CONTROLS
* <b>movement</b>: <code>WASD</code> or <code>&uarr;&larr;&darr;&rarr;</code>
* <b>rotation</b>: <code>[]</code> or <code>,.</code>
* <b>laser</b>: <code>SPACE</code>


## CODE
The app is powered by nodeJS, written in 100% raw javascript.
It uses the following packages:
* *websocket*: for real-time communication between client and server

---
<pre>
MazerTag
|
|- package.json
|
|- index.js
|
|- node_modules
|   |- websocket
|
|- node
|   |- core.js
|   |- game.js
|   |- session.js
|
|- js
|   |- game.js
|   |- home.js
|
|- css
|   |- game.css
|   |- home.css
|   |- main.css
|
|- html
|   |- _404.html
|   |- game.html
|   |- home.html
|
|- assets
	|- logo.png
</pre>
