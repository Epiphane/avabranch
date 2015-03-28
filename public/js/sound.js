(function(context, factory) {
   if (typeof module !== "undefined" && module.exports) {
      module.exports = factory();
   } else if (typeof define === "function" && define.amd) {
      define([], factory);
   } else {
      context.buz = factory(context);
   }
})(this, function() {
   // check if the default naming is enabled, if not use the chrome one.
   if (! window.AudioContext) {
      if (! window.webkitAudioContext) {
         alert('no audiocontext found');
      }
      window.AudioContext = window.webkitAudioContext;
   }
   var context = new AudioContext();

   var sound = function(src, options) {
      options = options || {};

      this.name     = src;
      this.playing  = false;
      this.ready    = false;
      this.autoplay = options.autoplay;
      this.volume   = options.volume;
      this.loop     = options.loop;
      this.preload  = options.preload;
      this.analyse  = options.analyse;
      this.time     = 0;

      this.events = {};

      this.sources = [];
      if (src instanceof Array) {
         for (var j in src) {
            if (src.hasOwnProperty(j)) {
               this.addSource(src[j]);
            }
         }
      } else if (options.formats) {
         for (var k in options.formats) {
            if (options.formats.hasOwnProperty(k)) {
               this.addSource(src + "." + options.formats[k]);
            }
         }
      } else {
         this.addSource(src);
      }

      this.gain = context.createGain();

      if (this.analyse) {
         this.analyser = context.createAnalyser();
         this.analyser.smoothingTimeConstant = 0.3;
         this.analyser.fftSize = 1024;

         this.gain.connect(this.analyser);

         this.monitor = context.createScriptProcessor(2048, 1, 1);
         // connect to destination, else it isn't called
         this.monitor.connect(context.destination);

         var self = this;
         this.monitor.onaudioprocess = function() {
            self.onaudioprocess();
         }
      }

      this.gain.connect(context.destination);

      if ((this.preload || this.autoplay) && this.sources.length > 0) {
         this.load();
      }
   };

   sound.prototype.onaudioprocess = function() {
      // get the average for the first channel
   }

   sound.prototype.addSource = function(src) {
      this.sources.push(src);
   };

   sound.prototype.setBuffer = function(buffer) {
      this.buffer = buffer;
      if (this.autoplay)
         this.play();

      this.setReady(true);
   };

   sound.prototype.load = function(src, onSuccess, onError) {
      if (arguments.length === 0) {
         var i = 0;
         this.loading = true;

         var self = this;
         var nextSource = function(err) {
            if (i >= self.sources.length)
               reportError(err);
            else {
               self.load(self.sources[i++], function(buffer) {
                  self.setBuffer(buffer);
                  self.loading = false;
               }, nextSource);
            }
         }

         nextSource('No sources available');
      }
      else {
         var request = new XMLHttpRequest();
         request.open('GET', src, true);
         request.responseType = 'arraybuffer';

         // When loaded decode the data
         request.onload = function() {
            // decode the data
            context.decodeAudioData(request.response, onSuccess, onError);
         }
         request.send();
      }
   };

   sound.prototype.start = function() {
      if (!(this.loading || this.ready))
         this.load();

      this.whenReady(function() {
         if (this.source)
            this.source.stop();

         var source = this.source = context.createBufferSource();
         this.source.connect(this.gain);
         this.source.loop = this.loop;
         this.source.buffer = this.buffer;

         var self = this;
         this.source.onended = function(event) {
            var elapsed = source.context.currentTime - source.startTime;
            if (elapsed >= source.buffer.duration) {
               self.trigger('complete');
               self.playing = false;
            }
         };

         this.source.start(0, this.time);
         source.startTime = this.source.context.currentTime - this.time;
         this.playing = true;
      });

      return this;
   };

   sound.prototype.play = function() {
      this.start();
   };

   sound.prototype.pause = function() {
      this.whenReady(function() {
         this.getTime();
         if (this.source)
            this.source.stop();
         this.playing = false;
      });

      return this;
   };

   sound.prototype.stop = function() {
      this.whenReady(function() {
         this.time = 0;
         if (this.source)
            this.source.stop();
         this.playing = false;
      });

      return this;
   };

   sound.prototype.getTime = function() {
      if (this.playing) {
         this.time = this.source.context.currentTime - this.source.startTime;
      }

      return this.time;
   };

   sound.prototype.getRemainingTime = function() {
      return this.getDuration() - this.getTime();
   };

   sound.prototype.getDuration = function() {
      return (this.buffer || {}).duration;
   };

   sound.prototype.setTime = function(time) {
      this.whenReady(function() {
         if (this.source)
            this.source.stop();
         this.time = time;
   
         if (this.playing)
            this.start();
      });
   };

   sound.prototype.setVolume = function(val) {
      this.gain.gain.value = val / 100;

      return this;
   };

   sound.prototype.getVolume = function() {
      return this.gain.gain.value * 100;
   };

   sound.prototype.mute = function() {
      return this.setVolume(0);
   };

   sound.prototype.unmute = function() {
      return this.setVolume(100);
   };

   sound.prototype.fadeTo = function(to, duration, callback) {
      if (duration instanceof Function) {
         callback = duration;
         duration = buzz.defaults.duration;
      } else {
         duration = duration || buzz.defaults.duration;
      }
      var from = this.getVolume(), delay = duration / Math.abs(from - to), self = this;
      this.play();
      function doFade() {
         setTimeout(function() {
            if (from < to && self.getVolume() < to) {
               self.setVolume(self.getVolume() + 1);
               doFade();
            } else if (from > to && self.getVolume() > to) {
               self.setVolume(self.getVolume() - 1);
               doFade();
            } else if (callback instanceof Function) {
               callback.apply(self);
            }
         }, delay);
      }
      this.whenReady(function() {
         doFade();
      });
      return this;
   };

   sound.prototype.fadeIn = function(duration, callback) {
      // return this.setVolume(0).fadeTo(100, duration, callback);
      this.setVolume(100);
   };
   sound.prototype.fadeOut = function(duration, callback) {
      // return this.fadeTo(0, duration, callback);
      this.setVolume(0);
   };

   sound.prototype.whenReady = function(func) {
      var self = this;
      if (!this.ready) {
         this.bind("ready", function() {
            func.call(self);
         });
      } else {
         func.call(self);
      }
   };

   sound.prototype.bind = function(event, func) {
      var callbacks = this.events[event] || [];
      callbacks.push(func);

      this.events[event] = callbacks;
   };

   sound.prototype.trigger = function(event) {
      var callbacks = this.events[event] || [];
      for (var i in callbacks) {
         callbacks[i].call(this);
      }
   };

   sound.prototype.setReady = function(ready) {
      this.ready = ready;
      if (ready)
         this.trigger('ready');
   };

   function reportError(e) {
      console.error(e);
   }

   return {
      sound: sound
   };
});