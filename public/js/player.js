// var tracks = [
// 	new buz.sound("/audio/ava_jungle_drums", {
// 		formats: [ "mp3" ],
// 		preload: true,
// 		autoplay: false,
// 		loop: true,
// 		// analyse: true
// 	}),
// 	new buz.sound("/audio/ava_jungle_bass", {
// 		formats: [ "mp3" ],
// 		preload: true,
// 		autoplay: false,
// 		loop: true,
// 		// analyse: true
// 	}),
// 	new buz.sound("/audio/ava_jungle_lead", {
// 		formats: [ "mp3" ],
// 		preload: true,
// 		autoplay: false,
// 		loop: true,
// 		// analyse: true
// 	}),
// 	new buz.sound("/audio/ava_jungle_melody", {
// 		formats: [ "mp3" ],
// 		preload: true,
// 		autoplay: false,
// 		loop: true,
// 		// analyse: thisrue
// 	})
// ];
var bps = 2.5167;
// var t, nt = new Date().getTime();
// var canv = document.getElementById('canv');
// setInterval(function() {
// 	console.log('beat');
// 	canv.style.background = '#333';
// 	setTimeout(function() { canv.style.background = 'black'; }, 50);
// }, 1000 / bps);

function Player(game, x, y, speed, ySpeed) {
	this.game = game
	this.speed = speed || 4
	this.ySpeed = ySpeed || 4
	this.lineCount = 4
	this.lineRadius = 10
	this.x = x || GAME_WIDTH / 2 - this.lineRadius * this.lineCount
	this.y = y || GAME_HEIGHT - GAME_HEIGHT / 3
	this.colors = ["#E67373", "#ECEC85", "#9DE970", "#708EE9"]//red, yellow, green, blue
	//this.keys=[['A','S'],['D','F'],['J','K'],['L',';']]
	this.branchState = 0
	this.branchStates = [1, 4]
	//this.keyMaps = {
	//	1 : [['A', 'F'], ['A', 'F'], ['A', 'F'], ['A', 'F']],
	//	4 : [['A', 'S'], ['D', 'F'], ['J', 'K'], ['L', ';']]
	//}
	this.lines = []
	for (var i = 0; i < this.lineCount; i++) {
		this.lines.push(new Line(this.game, global_controls.colors[i], this.x + i * this.lineRadius * 2, this.y, this.lineRadius, global_controls.keyMaps[this.branchStates[this.branchState]][i], this.speed, this.ySpeed));
	}
	//bad - start with 2 lines
	this.lines[0].setDead(false);
	this.lines[1].setDead(false);
	this.lines[2].setDead(true);
	this.lines[3].setDead(true);

	this.setMusic = function(music) {
		for(var i = 0; i < 4; i ++)
			this.lines[i].setTrack(music.tracks[i]);
	};
	
	this.physics = function(timeDelta) {
		var dead = 0
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			if (line.isDead) {
				dead += 1
			}
		}
		/*if (dead === 2) {
			if (this.branchState > 1)
				this.branchState = 1
			this.branchStates = [1, 4]
		}
		if (dead === 3) {
			if (this.branchState > 0)
				this.branchState = 0
			this.branchStates = [1]
		}*/
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			line.keys = global_controls.keyMaps[this.branchStates[this.branchState]][i]
			line.physics(timeDelta)
		}
	}
	
	this.setLineSpeed = function(speed) {
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			line.speed = speed
		}
	}
	this.setLineRadius=function(rad){
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			line.r = rad
		}
		if(this.branchState===0)
			this.merge()
	}
	this.draw = function(ctx) {
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			line.draw(ctx)
		}
	}
	this.splitAll = function() {
		var keys = {}
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]

			if (line.isDead)
				continue

			var k = line.keys[0]
			if (keys[k]) {
				keys[k].lines.push(line)
			} else {
				keys[k] = {
					lines : [line]
				}
			}
		}
		var keyAccess = Object.keys(keys)
		for (var i = 0; i < keyAccess.length; i++) {
			var k = keyAccess[i]
			if (keys[k].lines.length > 1) {
				for (var j = 1; j < keys[k].lines.length; j++) {
					keys[k].lines[j].tarX = keys[k].lines[j].r * 1.25 * j + keys[k].lines[j].x
				}
			}
		}
	}
	this.hasCol = function(color) {
		for (var i = 0; i < this.lines.length; i++) {
			if (this.lines[i].color === color && !this.lines[i].isDead) {
				return true
			}
		}
		return false
	}
	this.getCol = function(color) {
		for (var i = 0; i < this.lines.length; i++) {
			if (this.lines[i].color === color) {
				return this.lines[i]
			}
		}
		return this.lines[0]
	}
	this.merge = function() {
		var sum = 0
		var cnt = 0
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			if (!line.isDead) {
				sum += line.x
				cnt += 1
			}
		}
		var avg = sum / cnt
		var aliveNum = 0
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			if (!line.isDead) {
				line.tarX = aliveNum * line.r * 2 + avg
				aliveNum += 1
			}
		}
	}
	keyListeners.push([' ', function() {
		this.branchState += 1
		this.branchState = this.branchState % this.branchStates.length
		var alive = 0

		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			if (!line.isDead) {
				alive += 1
			}
		}
		if (this.branchState === 0) {//bring pieces back together
			this.merge()
		} 
		/*else if (this.branchState === 1) {//separate
			var moveCnt = 1
			var numLeftOf = 0
			if (alive === 2) {
				this.splitAll()
			} else {
				for (var i = 2; i < this.lines.length; i++) {
					var line = this.lines[i]
					line.tarX = 1 * line.r * 2 + line.x
				}
			}
		} else if (this.branchState === 2) {//split all
			this.splitAll()

		}*/
		else{
			this.splitAll()
		}

	}.bind(this)])

}