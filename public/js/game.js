// var music = new buzz.sound("/audio/background", {
// 	formats: [ "mp3", "ogg" ],
// 	preload: true,
// 	autoplay: false,
// 	loop: true
// });
// var musicTime = 4.55;

function Game(canvas) {
	this.ext_canvas = canvas
	this.ext_ctx = canvas.getContext("2d")

	this.canvas = document.createElement('canvas');
	this.canvas.width = GAME_WIDTH;
	this.canvas.height = GAME_HEIGHT;
	this.ctx = this.canvas.getContext('2d');

	this.objects = []
	this.prevTime = Date.now()
	this.speed = 4
	this.paused = false
	this.play = true
	this.timeTillLevel = 5000
	this.timer = 0
	
	var musicFading = false;
	var musicPlaying = false;
	this.setMusic = function(on) {
		return;

		if (on != musicPlaying) {
			if (on) {
				music.setTime(musicTime);
				musicFading = true;
				music.fadeIn(200, function() {
					musicFading = false;
				});
			}
			else {
				if (musicFading) {
					music.stop();
					musicTime = music.getTime();
				}
				else
					music.fadeOut(200, function() {
						musicTime = music.getTime();
					});
			}

			musicPlaying = on;
		}
	}
	this.update = function(time) {
		if (!this.play)
			return;

		syncTracks();

		this.timeDelta = time - this.prevTime
		this.prevTime = time
		if (isNaN(this.timeDelta)) {
			requestAnimFrame(this.update.bind(this))
			return
		}
		this.ctx.fillStyle = '#000';
		this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
		this.ext_ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
		this.physics(this.timeDelta)
		this.draw()

		var numSlices = GAME_HEIGHT / 4;
		var sliceHeight = GAME_HEIGHT / numSlices;
		var topWidth = 0.1;
		var bottomWidth = 0.75;
		for (var n = 0; n < numSlices; n ++) {
			var sy = n * sliceHeight;
			var dWidth = topWidth + bottomWidth * (1 - topWidth) * (n + 1) / numSlices;

			dWidth *= this.ext_canvas.width;
			var dx = (this.ext_canvas.width - dWidth) / 2;

			this.ext_ctx.drawImage(this.canvas, 0, sy, GAME_WIDTH, sliceHeight, 
				dx, (this.ext_canvas.height + sy) / 2, dWidth, 
				sliceHeight * this.ext_canvas.height / GAME_HEIGHT);
		}

		this.objects.hud.draw(this.ext_ctx);

		requestAnimFrame(this.update.bind(this));
	}
	this.physics = function(timeDelta) {
		this.timer += timeDelta
		if (this.timer > this.timeTillLevel) {
			this.timer = 0
			if (this.objects["spawner"]) {
				this.objects["spawner"].level += 1
			}
			if (this.objects["power_spawn"]) {
				this.objects["power_spawn"].spawn()
			}
		}
		for (var i = 0; i < this.objects.length; i++) {
			this.objects[i].physics(timeDelta)
		}
	}

	this.draw = function() {
		this.ctx.fillStyle = '#232323';
		for (var x = 0; x <= GAME_WIDTH; x += GAME_WIDTH / 8)
			this.ctx.fillRect(x - 5, 0, 10, GAME_HEIGHT);

		for (var i = 0; i < this.objects.length; i++) {
			if (this.objects[i] === this.objects['hud'])
				; // Ignore
				// this.objects.hud.draw(this.ext_ctx);
			else
				this.objects[i].draw(this.ctx);
		}
	}

	this.addObject = function(name, o) {
		this.objects[name] = o
		this.objects.push(o)
	}
}