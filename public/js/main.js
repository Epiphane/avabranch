var canvas = document.getElementById("canv")
var selecting=false
var keyListeners = []
var keyState = {};
var keyMap = {
	13 : 'enter',
	37 : 'left',
	38 : 'up',
	39 : 'right',
	40 : 'down',
	186 : ';'
};

var hud;
var GAME_WIDTH = 800, GAME_HEIGHT = 600;
function init() {
	if(localStorage.soundSettings && localStorage.soundSettings=="off")
		turnOffSound()
	keyListeners = []
	canvas.width = 800
	canvas.height = 600
	game = new Game(canvas)
	global_controls = new Controls()
	hud = new HUD(game, true)
	game.addObject("hud", hud)

	window.onresize();
}

window.onresize = function() {
	var wrapper = canvas.parentElement;

	var width = wrapper.width || wrapper.clientWidth;
	var height = wrapper.height || wrapper.clientHeight;
	if (width * 3 / 4 > height) {
		canvas.height = height;
		canvas.width = height * 4 / 3;
	}
	else {
		canvas.width = width;
		canvas.height = width * 3 / 4;
	}

	game.ctx.save();
	game.ctx.scale(canvas.width / GAME_WIDTH, canvas.height / GAME_HEIGHT);
	hud.draw(game.ext_ctx);
	game.ctx.restore();
};

function startGame() {
	keyListeners = []
	game.play = false
	game = new Game(canvas)
	player = new Player(game, null, null, null, game.speed)
	spawner = new BlockSpawner(game, game.speed)
	hud = new HUD(game)
	power_spawner = new PowerupSpawner(game)
	game.addObject("spawner", spawner)
	game.addObject("player", player)
	game.addObject("power_spawn", power_spawner)
	game.addObject("hud", hud)
	game.setMusic(true);
	game.update()
}

function toggleSound(){
	var button = document.getElementById("mute")
	if(button.className.indexOf("up")!=-1){//need to mute
		button.className = button.className.replace("up","off")
		localStorage.soundSettings="off"
		music.mute();
	}
	else{//turn back on
		button.className = button.className.replace("off","up")
		localStorage.soundSettings="on"
		music.unmute();
	}
}

function turnOffSound(){
	var button = document.getElementById("mute")
	if(button.className.indexOf("up")!=-1){//need to mute
		toggleSound()
	}
}
function turnOnSound(){
	var button = document.getElementById("mute")
	if(button.className.indexOf("off")!=-1){//need to start
		toggleSound()
	}
}

window.requestAnimFrame = (function() {
	return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	function(/* function */callback, /* DOMElement */element) {
		window.setTimeout(callback, 1000 / 60)
	}

})()
window.onkeydown = function(e) {
	try {
		keyState[keyMap[e.which] || String.fromCharCode(e.which)] = e.which;
	} catch(e) {
		console.log('error converting keypress to char code')
	}
}
window.onkeyup = function(e) {
	try {
		delete keyState[keyMap[e.which] || String.fromCharCode(e.which)];
	} catch(e) {
		console.log('error deleting keypress to char code')
	}
}
window.onkeypress = function(e) {
	for (var i = 0; i < keyListeners.length; i++) {
		var k = keyMap[e.which] || String.fromCharCode(e.which)
		if (keyListeners[i][0] === k) {
			e.preventDefault()
			keyListeners[i][1]();
		}
	}
}
init();
