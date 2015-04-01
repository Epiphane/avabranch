function Music(name, bpm) {
   this.tracks = [
      new buz.sound('/audio/ava_' + name + '_drums', {
         formats: [ 'mp3' ],
         // loop: true,
         analyse: true
      }),
      new buz.sound('/audio/ava_' + name + '_bass', {
         formats: [ 'mp3' ],
         // loop: true,
         analyse: true
      }),
      new buz.sound('/audio/ava_' + name + '_lead', {
         formats: [ 'mp3' ],
         // loop: true,
         analyse: true
      }),
      new buz.sound('/audio/ava_' + name + '_melody', {
         formats: [ 'mp3' ],
         // loop: true,
         analyse: true
      })
   ];

   this.bpm = bpm;
   this.beat = 1;

   this.callbacks = {};

   var self = this;
   this.tracks[0].bind('complete', function() {
      self.trigger('complete');
   });

   this.ready = false;
   this.bind('ready', function() {
      self.ready = true;
   });

   this.songsReady = 0;
   for (var i in this.tracks) {
      this.tracks[i].bind('ready', function() {
         if (++self.songsReady === self.tracks.length) {
            self.trigger('ready');
         }
      });
   }

   var self = this;
   var max = 0, up = true;
   var nt = new Date().getTime();
   var sound = this.tracks[0];
   sound.onaudioprocess = function() {
      var array = new Uint8Array(sound.analyser.frequencyBinCount);
      sound.analyser.getByteFrequencyData(array);

      var tot = 0, num = 0;
      for (var i in array) {
         tot += array[i];
         num ++;
      }
      var average = tot / num;

      if (up) {
         if (average >= max)
            max = average;
         else {
            // console.log(max)
            up = false;
         }
      }
      else {
         if (average < max)
            max = average;
         else
            up = true;
      }
   }
}

Music.prototype.getBeat = function() {
   var time = this.tracks[0].getTime();
   return time * 2;
};

Music.prototype.update = function() {
   var beat = Math.floor(this.getBeat()) + 1;

   if (beat > this.beat) {
      this.beat = beat;
      this.trigger('beat');
   }
};

Music.prototype.trigger = function(event) {
   var callbacks = this.callbacks[event] || [];
   for (var i in callbacks) {
      callbacks[i].call(this);
   }
};

Music.prototype.bind = function(event, callback) {
   var callbacks = this.callbacks[event] || [];
   callbacks.push(callback);

   this.callbacks[event] = callbacks;
};

Music.prototype.load = function() {
   for (var i in this.tracks) {
      this.tracks[i].load();
   }
};

Music.prototype.play = function() {
   for (var i in this.tracks) {
      this.tracks[i].play();
   }
};

Music.prototype.pause = function() {
   for (var i in this.tracks) {
      this.tracks[i].pause();
   }
};