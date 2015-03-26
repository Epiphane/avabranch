// var music = new buzz.sound("/audio/background", {
// 	formats: [ "mp3", "ogg" ],
// 	preload: true,
// 	autoplay: false,
// 	loop: true
// });
// var musicTime = 4.55;

function Game(canvas) {
	this.canvas = canvas
	this.ctx = canvas.getContext("2d")
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
		this.ctx.save();
		this.ctx.scale(canvas.width / GAME_WIDTH, canvas.height / GAME_HEIGHT);
		this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
		this.physics(this.timeDelta)
		this.draw()
		this.ctx.restore();
		requestAnimFrame(this.update.bind(this))
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
		for (var i = 0; i < this.objects.length; i++) {
			this.objects[i].draw(this.ctx);
		}
	}

	this.addObject = function(name, o) {
		this.objects[name] = o
		this.objects.push(o)
	}
}