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

      this.playing  = false;
      this.ready    = false;
      this.autoplay = options.autoplay;
      this.volume   = options.volume;
      this.loop     = options.loop;
      this.preload  = options.preload;
      this.analyse  = options.analyse;
      this.time     = 0;

      this.sources = [];
      if (src instanceof Array) {
         for (var j in src) {
            if (src.hasOwnProperty(j)) {
               this.addSource(src[j]);
            }
         }
      } else if (options.formats.length) {
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

      this.ready = true;
   };

   sound.prototype.load = function(src, onSuccess, onError) {
      if (arguments.length === 0) {
         var i = 0;

         var self = this;
         var nextSource = function(err) {
            if (i >= self.sources.length)
               reportError(err);
            else {
               self.load(self.sources[i++], function(buffer) {
                  self.setBuffer(buffer);
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

   sound.prototype.play = function() {
      if (this.playing)
         return this;

      this.source = context.createBufferSource();
      this.source.connect(this.gain);
      this.source.loop = this.loop;
      this.source.buffer = this.buffer;

      this.source.start(0, this.time);
      this.startTime = this.source.context.currentTime;
      this.playing = true;

      console.log(this.buffer.duration);

      return this;
   };

   sound.prototype.pause = function() {
      this.getTime();
      if (this.playing)
         this.source.stop();
      this.playing = false;

      return this;
   };

   sound.prototype.stop = function() {
      this.time = 0;
      if (this.playing)
         this.source.stop();
      this.playing = false;

      return this;
   };

   sound.prototype.getTime = function() {
      if (this.playing) {
         this.time = this.source.context.currentTime - this.startTime
      }

      return this.time;
   };

   sound.prototype.setTime = function(time) {
      this.time = time;
      if (this.playing)
         this.stop();
      this.playing = false;

      this.play();
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
      return this.setVolume(0).fadeTo(100, duration, callback);
   };
   sound.prototype.fadeOut = function(duration, callback) {
      return this.fadeTo(0, duration, callback);
   };

   sound.prototype.whenReady = function(func) {
      var self = this;
      if (!this.ready) {
         // this.bind("canplay.buzzwhenready", function() {
            func.call(self);
         // });
      } else {
         func.call(self);
      }
   };

   var audioBuffer;
   var sourceNode;
   var analyzer, javascriptNode;


   // load the sound
   // setupAudioNodes();
   // loadSound("/audio/track4.ogg");

   function setupAudioNodes() {
      // setup a javascript node
      // javascriptNode = context.createScriptProcessor(2048, 1, 1);
      // connect to destination, else it isn't called
      // javascriptNode.connect(context.destination);

      // analyzer = context.createAnalyser();
      // analyzer.smoothingTimeConstant = 0.3;
      // analyzer.fftSize = 1024;

      // create a buffer source node
      sourceNode = context.createBufferSource();

      // analyzer.connect(javascriptNode);

      // connext source to analyzer
      // sourceNode.connect(analyzer);

      // and connect to destination
      sourceNode.connect(context.destination);
   }

   // load the specified sound
   function loadSound(url) {
      var request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';

      // When loaded decode the data
      request.onload = function() {

         // decode the data
         context.decodeAudioData(request.response, function(buffer) {
            // when the audio is decoded play the sound
            playSound(buffer);
         }, onError);
      }
      request.send();
   }


   function playSound(buffer) {
      sourceNode.buffer = buffer;
      sourceNode.start(0);
   }

   // log if an error occurs
   function reportError(e) {
      console.error(e);
   }

   // javascriptNode.onaudioprocess = function() {
   //    // Get the average for the first channel
   //    var array = new Uint8Array(analyzer.frequencyBinCount);
   //    analyzer.getByteFrequencyData(array);
   //    var average = getAverageVolume(array);

   //    // console.log(average);
   // };

   function getAverageVolume(array) {
      var values = 0;
      var average;

      var length = array.length;

      // get all the frequency amplitudes
      for (var i = 0; i < length; i++) {
         values += array[i];
      }

      average = values / length;
      return average;
   }

   return {
      sound: sound
   };
});