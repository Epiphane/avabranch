function Music(name) {
   this.tracks = [
      new buz.sound('/audio/ava_' + name + '_drums', {
         formats: [ 'mp3' ],
         // loop: true,
         // analyse: true
      }),
      new buz.sound('/audio/ava_' + name + '_bass', {
         formats: [ 'mp3' ],
         // loop: true,
         // analyse: true
      }),
      new buz.sound('/audio/ava_' + name + '_lead', {
         formats: [ 'mp3' ],
         // loop: true,
         // analyse: true
      }),
      new buz.sound('/audio/ava_' + name + '_melody', {
         formats: [ 'mp3' ],
         // loop: true,
         // analyse: true
      })
   ];

   this.callbacks = {};

   var self = this;
   this.tracks[0].bind('complete', function() {
      self.trigger('complete');
   });
}

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