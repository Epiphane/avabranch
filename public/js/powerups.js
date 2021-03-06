function PowerupSpawner(game, level) {
	this.game = game
	this.powerups = []
	this.level = level || 1
	this.colors = ["#E67373", "#ECEC85", "#708EE9", "#9DE970"];
	this.powers = ["grow", 	  "shrink",  "slow",    "speed"];
	this.draw = function(ctx) {
		for (var i = 0; i < this.powerups.length; i++) {
			this.powerups[i].draw(ctx)
		}
	}
	this.physics = function(timeDelta) {
		for (var i = this.powerups.length - 1; i >= 0; i--) {
			this.powerups[i].physics(timeDelta)
			if (this.powerups[i].isDead) {
				this.powerups.splice(i, 1)
			}
		}
	}
	this.spawn = function(target) {
		var x = Math.random() * GAME_WIDTH
		var y = -30
		var i = 0;
		while (i < this.powers.length && game.objects["player"].hasCol(this.colors[i]))
			i ++;
		if (i === 4)
			i = Math.floor(Math.random() * this.powers.length);

		this.powerups.push(new Powerup(this, x, y, this.powers[i], target));
	}
}

function Powerup(parent, x, y, type, target) {
	this.parent = parent
	this.x = x || 0
	this.y = y || 0
	this.r = 5
	this.isDead = false
	this.remove = false
	this.target = target || parent.game.music.beat + 8;
	this.start  = parent.game.music.beat;
	this.type = type || "slow"
	this.particles = []
	this.particleCount = 120
	if (this.type === "slow") {
		this.color = "#708EE9"//blue
		this.act = function() {
			var player = this.parent.game.objects["player"]
			if (!player.hasCol(this.color)) {
				player.getCol(this.color).revive()
			} else {
				player.setLineSpeed(player.speed - 2)
				this.powerTimer = setTimeout(function(player) {
					player.setLineSpeed(player.speed)
				}, 10000, this.parent.game.objects["player"])
			}
		}
	} else if (this.type === "speed") {
		this.color = "#9DE970"//green
		this.act = function() {
			var player = this.parent.game.objects["player"]
			if (!player.hasCol(this.color)) {
				player.getCol(this.color).revive()
			} else {
				player.setLineSpeed(player.speed + 2)
				this.powerTimer = setTimeout(function(player) {
					player.setLineSpeed(player.speed)
				}, 10000, this.parent.game.objects["player"])
			}
		}
	} else if (this.type === "grow") {
		this.color = "#E67373"//red
		this.act = function() {
			var player = this.parent.game.objects["player"]
			if (!player.hasCol(this.color)) {
				player.getCol(this.color).revive()
			} else {
				player.setLineRadius(player.lineRadius + 3)
				this.powerTimer = setTimeout(function(player) {
					player.setLineRadius(player.lineRadius)
				}, 10000, this.parent.game.objects["player"])
			}
		}
	} else if (this.type === "shrink") {
		this.color = "#ECEC85"//yellow
		this.act = function() {
			var player = this.parent.game.objects["player"]
			if (!player.hasCol(this.color)) {
				player.getCol(this.color).revive()
			} else {
				player.setLineRadius(player.lineRadius - 3)
				this.powerTimer = setTimeout(function(player) {
					player.setLineRadius(player.lineRadius)
				}, 10000, this.parent.game.objects["player"])
			}
		}
	}
	for (var i = 0; i < this.particleCount; i++) {
		this.particles.push(new Particle(this, Math.random() / 20 + .05, Math.random() * 15 + 6))
	}
	this.draw = function(ctx) {
		ctx.fillStyle = this.color
		ctx.fillRect(0, this.y, GAME_WIDTH, 10);
	}
	this.physics = function(timeDelta) {
		if (!this.isDead) {
			var beat = this.parent.game.music.getBeat();
			var dist = (this.target - beat) / (this.target - this.start);

			this.y = (1 - dist) * GAME_HEIGHT * 2 / 3;
		}

		if (this.isDead) {
			this.remove = true
		}

		for (var i = 0; i < this.particles.length; i++) {
			this.particles[i].physics(timeDelta)
		}
	}
}

function Particle(parent, speed, dist) {
	this.parent = parent
	this.speed = speed || .1
	this.dist = dist
	this.radius = 1
	this.x = this.parent.x + 20 || 0
	this.y = this.parent.y + 20 || 0
	this.rot = Math.random() * Math.PI

	this.r = 0
	this.g = 130
	this.b = 130
	this.draw = function(ctx) {
		ctx.fillStyle = this.parent.color
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, Math.PI * 2, false)
		ctx.fill()
		ctx.closePath()
	}
	this.physics = function(timeDelta) {
		if (this.parent.isDead)
			this.dist -= 1
		if (this.dist <= 0) {
			this.dist = 0
			this.radius = 0
		}

		this.rot += this.speed
		this.x = this.parent.x + Math.sin(this.rot) * this.dist
		this.y = this.parent.y + Math.cos(this.rot) * this.dist
	}
}

