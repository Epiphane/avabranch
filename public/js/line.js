function Line(game, color, x, y, r, keys, xSpeed, ySpeed, sound) {
	this.game = game
	this.x = x || GAME_WIDTH / 2
	this.y = y || GAME_HEIGHT / 2
	this.r = r || 5
	this.base_r = r || 5
	this.color = color || "#E67373"
	this.points = []
	this.keys = keys || ['A', 'S']
	this.clearCount = 200
	this.tarX = -1
	this.tarXRate = -1
	this.tarXTime = 0
	this.speed = xSpeed || 4
	this.ySpeed = ySpeed || 4
	this.isDead = true;
	this.ticks_per_point = 1;
	this.ticks = 0;

	this.times = [0, 0, 0, 0, 0, 0, 0, 0, 0];

	sound.play();
	sound.mute();

	if (sound.analyse) {
		var self = this;
		// var max = 0, up = true;
		// var nt = new Date().getTime();
		sound.onaudioprocess = function() {
	      var array = new Uint8Array(sound.analyser.frequencyBinCount);
	      sound.analyser.getByteFrequencyData(array);

	      var tot = 0, num = 0;
	      for (var i in array) {
	      	tot += array[i];
	      	num ++;
	      }
	      var average = tot / num;

	      // 2.5167
	      // if ((up && average > max) || (!up && average < max)) {
	      // 	max = average;
	      // 	document.getElementById('canv').style.background = 'black';
	      // }
	      // else {
	      // 	up = !up;
	      // 	if (!up) {
		     //  	var t = new Date().getTime();
		     //  	self.times.push(t - nt);
		     //  	self.times.shift();
		     //  	nt = t;

		     //  	var tot = 0, num = 0;
			    //   for (var i in self.times) {
			    //   	tot += self.times[i];
			    //   	num ++;
			    //   }
		     //  	console.log(1000 / (tot / num));
		     //  	document.getElementById('canv').style.background = '#333333';
		     //  }
	      // }

	      self.r = average / 6 + self.base_r;
		}
	}
	
	var fading = false;
	this.setDead = function(dead) {
		this.isDead = dead;
		if (!dead) {
			fading = true;
			sound.unmute();
			sound.fadeIn(200, function() {
				fading = false;
			});
		}
		else {
			if (fading)
				sound.mute();
			else
				sound.fadeOut(200);
		}
	};

	this.clearGone = function(){
		for (var i = this.points.length - 1; i >= 0; i--) {
				if (this.points[i].y > GAME_HEIGHT+this.r*2) {
					this.points.splice(0, i)
					break
				}
			}
	}
	this.revive=function(){
		var lines = this.game.objects['player'].lines
		for(var i=lines.length-1;i>=0;i--){
			if(!lines[i].isDead){
				this.x=lines[i].x+lines[i].r*2
				break
			}
		}
		
		this.setDead(false);
	}
	this.physics = function(timeDelta) {
		if (this.points.length >= this.clearCount) {
			this.clearGone()
		}
		for (var i = 0; i < this.points.length; i++) {
			this.points[i].y += .05 * timeDelta * this.ySpeed
		}
		if (this.tarX == -1) {
			if (keyState[this.keys[0]]) {//left
				this.x -= this.speed * timeDelta * .05
			} else if (keyState[this.keys[1]]) {//right
				this.x += this.speed * timeDelta * .05
			}
		} else {
			if (this.tarXRate == -1) {
				this.tarXTime = 20
				var dist = Math.abs(this.x - this.tarX)
				this.tarXRate = dist / this.tarXTime
			}
			this.x += this.tarXRate * (this.x < this.tarX ? 1 : -1)
			this.tarXTime -= 1
			if (this.tarXTime <= 0) {
				this.x = this.tarX
				this.tarX = -1
				this.tarXRate = -1
			}
		}
		if (!this.isDead) {//} && this.ticks-- <= 0) {
			this.points.push({
				y : this.y,
				x : this.x,
				r : this.r - 3,
				color : this.color
			});

			this.ticks = this.ticks_per_point;
		}

		//check collision
		if (game.objects["spawner"] && !this.isDead) {
			if (this.x - this.r < 0 || this.x + this.r > GAME_WIDTH) {
					this.setDead(true);
				return
			}
			var blocks = game.objects["spawner"].blocks
			for (var i = 0; i < blocks.length; i++) {
				if(collideRoundSquare(this,blocks[i])){
					this.setDead(true);
					break
				}
			}
			var powerups = game.objects['power_spawn'].powerups
			for(var i =0;i<powerups.length;i++){
				if(!powerups[i].isDead && this.y <= powerups[i].y){
					powerups[i].act();
					powerups[i].isDead = true;
					break
				}
			}
		}

	}
	this.draw = function(ctx) {
		var tail = this.points[0]
		var head = this.points[this.points.length-1]
		if(!tail || !head)
			return

		ctx.beginPath();
		ctx.lineWidth=this.base_r * 2
		ctx.lineCap='round'
		ctx.lineJoin='round'
		ctx.moveTo(tail.x,tail.y);
		ctx.strokeStyle = tail.color
		
		for (var i = 1; i < this.points.length; i++) {
			var point = this.points[i]
			ctx.lineTo(point.x,point.y)
			// ctx.arc(point.x, point.y, point.r, 0, 2 * Math.PI, false);
			// ctx.fill();
			// ctx.closePath();
			// ctx.fillRect(point.x - point.r / 2, point.y - point.r / 2, point.r, point.r);
		}
		ctx.stroke();
		ctx.closePath();

		ctx.beginPath();
		ctx.fillStyle = 'white';
		ctx.arc(head.x, head.y, head.r + 1, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.closePath();
	}
}