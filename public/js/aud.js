
const BUFFER_SIZE = 4096;
const NUM_OUTPUTS = 2;
const NUM_INPUTS = 0; 

var _browserType = navigator.userAgent ;
console.log("Browser Type = " + _browserType);
      
var audio_context;
if (_browserType.indexOf("Chrome") != -1)
   audio_context = new webkitAudioContext();
else
   audio_context = new AudioContext();
   
var sampleRate = this.audio_context.sampleRate;

var node;
if (_browserType.indexOf("Chrome") != -1)
   node = this.audio_context.createJavaScriptNode(BUFFER_SIZE, NUM_INPUTS, NUM_OUTPUTS);
else
   node = this.audio_context.createScriptProcessor(BUFFER_SIZE, NUM_INPUTS, NUM_OUTPUTS);

var aud_waves = new function(){
   this.Saw = 0;
   this.Tri = 1;
   this.Square = 2;
   this.Noise = 3;
}    
   
var aud_interface = function()
{   
   this.pattern = 0;
   this.increment_pattern_pos = 0;
   this.to_pattern = 0;
   this.to_time = 0;
   this.to_total = 0;
   
   this.paused = true;
   
   this.gainNode;
   if (_browserType.indexOf("Chrome") != -1)
      this.gainNode = audio_context.createGainNode();
   else
      this.gainNode = audio_context.createGain();
    this.gainNode.gain.value = 1;
    node.connect(this.gainNode);
    this.gainNode.connect(audio_context.destination); 

   this.notes = new Array();
   for (var i = 0; i < 8; i++)
      this.notes[i * 12] = 4186.01 /* C 8 */ / Math.pow(2, 8 - i - 1); // C notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 1] = 2217.46 /* C# 7 */ / Math.pow(2, 7 - i - 1); // C# notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 2] = 2349.32 /* D 7 */ / Math.pow(2, 7 - i - 1); // D notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 3] = 2489.02 /* D# 7 */ / Math.pow(2, 7 - i - 1); // D# notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 4] = 2637.02 /* E 7 */ / Math.pow(2, 7 - i - 1); // E notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 5] = 2793.83 /* F 7 */ / Math.pow(2, 7 - i - 1); // F notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 6] = 2959.96 /* F# 7 */ / Math.pow(2, 7 - i - 1); // F# notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 7] = 3135.96 /* G 7 */ / Math.pow(2, 7 - i - 1); // G notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 8] = 3322.44 /* G# 7 */ / Math.pow(2, 7 - i - 1); // G# notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 9] = 3520.00 /* A 7 */ / Math.pow(2, 7 - i - 1); // A notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 10] = 3729.31 /* A# 7 */ / Math.pow(2, 7 - i - 1); // A# notes
   for (var i = 0; i < 7; i++)
      this.notes[i * 12 + 11] = 3951.07 /* B 7 */ / Math.pow(2, 7 - i - 1); // B notes

    var self = this;
   
   this.NoteToFrequency = function(note)
   {
      return self.notes[note];
   }  
   
   this.NoteToLetter = function(note)
   {
      var retval = "";
      switch (note % 12)
      {
         case 0: retval += "C "; break;
         case 1: retval += "C# "; break;
         case 2: retval += "D "; break;
         case 3: retval += "D# "; break;
         case 4: retval += "E "; break;
         case 5: retval += "F "; break;
         case 6: retval += "F# "; break;
         case 7: retval += "G "; break;
         case 8: retval += "G# "; break;
         case 9: retval += "A "; break;
         case 10: retval += "A# "; break;
         case 11: retval += "B "; break;
      }
      retval += (Math.floor(note / 12) + 1) + " ";
      
      return retval;
   }
   
   this.t = 0;
   this.prev_pos = 0;
   this.vol = 1;
   this.speed = 1;
   
   function findInterpedOsc(instr, t, spc)
   {
      var ndx = (t % spc) / spc;
      var bf = -1;
      for (var i = 0; i < instr.wave_pts.length - 1; i++)
      {
         if (ndx >= instr.wave_pts[i].x && ndx <= instr.wave_pts[i + 1].x)
         {
            bf = i;
            break;
         }
      }
      var interp = (ndx - instr.wave_pts[i].x) / (instr.wave_pts[i + 1].x - instr.wave_pts[i].x);
      return (1 - interp) * instr.wave_pts[i].y + interp * instr.wave_pts[i + 1].y;
   }
   function Envelope(instr, t)
   {
      if (t > instr.numsamples)
         return 0;
      // release
      if (t > instr.numsamples * instr.env_pts[3].x)
      {
         var interp = (t - instr.numsamples * instr.env_pts[3].x) / 
            (instr.numsamples * (1 - instr.env_pts[3].x));
         return (1 - interp) * instr.env_pts[3].y;
      }
      // attack/decay
      if (t < instr.numsamples * instr.env_pts[2].x)
      {
         if (t < instr.numsamples * instr.env_pts[1].x)
         {
            var interp = t / (instr.numsamples * instr.env_pts[1].x);
            return interp * instr.env_pts[1].y;
         }
         else
         {
            var interp = (t - instr.numsamples * instr.env_pts[1].x) / 
               (instr.numsamples * instr.env_pts[2].x - instr.numsamples * instr.env_pts[1].x);
            return ((1 - interp) * instr.env_pts[1].y + interp * instr.env_pts[2].y);
         }
      }
      else
      {
         // sustain
         return instr.env_pts[3].y;
      }
   }
   function LFO(instr, t)
   {
      var spc = sampleRate / instr.LFOfreq;
      var ndx = (t % spc) / spc;
      
      return (1 + (instr.LFOamp / 100) * Math.sin(ndx * 6.28));
   }
   
   
   this.renderAudio = function(instr, freq, t)
   {
      if (instr.numsamples < instr.totallen && t % instr.totallen > instr.numsamples)
         return 0; 
      t = t % instr.totallen;
   
      var spc = sampleRate / freq;
      var result = (instr.noise? Math.random() : findInterpedOsc(instr, t / self.speed, spc));
      if (instr.noise) result *= 1 - (t / instr.numsamples);
      else result *= Envelope(instr, t);
      if (!instr.noise) result *= LFO(instr, t / self.speed);
      return result;
   }
      
   this.generateAudio = function(e)
   {
      var left  = e.outputBuffer.getChannelData(0);
      var right = e.outputBuffer.getChannelData(1);

      var numTracks = self.pattern.length;

      var numSamples = left.length;
      for (var i = 0; i < numSamples; i++) 
      {     
         main_output = 0;
         var current_pat_pos = Math.floor(self.t / 10000);
         var phase = self.t / sampleRate * 2 * Math.PI / self.speed;
         
         // Start
         for (var track = 0; track < numTracks; track++)
         {           
            var curpos = current_pat_pos % self.pattern[track].pattern.length;
            var note = self.pattern[track].pattern[curpos];
            // find nearest note played
            var temp = 1;
            while (note < 0 && temp < self.pattern[track].instrument.numsamples / 10000)
            {
               curpos--;
               if (curpos == -1) curpos = self.pattern[track].pattern.length - 1;
               
               note = self.pattern[track].pattern[curpos];
               temp++;
            }
            if (note < 0) continue;
            
            var freq = self.notes[note];
            
            main_output += self.renderAudio(self.pattern[track].instrument, freq, self.t) * 
               self.pattern[track].instrument.volume * self.vol;
         }
         
         if (self.to_time != 0)
         {
            main_output *= (self.to_time / self.to_total);
            var lerp = 1 - (self.to_time / self.to_total);
         
            for (var track = 0; track < numTracks; track++)
            {
               var wave = self.to_pattern[track].instrument.waveform;
               
               var curpos = current_pat_pos % self.to_pattern[track].pattern.length;
               var note = self.to_pattern[track].pattern[curpos];
               // find nearest note played
               var temp = 1;
               while (note < 0 && temp < self.to_pattern[track].instrument.numsamples / 10000)
               {
                  curpos--;
                  if (curpos == -1) curpos = self.to_pattern[track].pattern.length - 1;
                  
                  note = self.to_pattern[track].pattern[curpos];
                  temp++;
               }
               if (note < 0) continue;
               
               var freq = self.notes[note];
               
               main_output += self.renderAudio(self.to_pattern[track].instrument, freq, self.t) * 
                  self.to_pattern[track].instrument.volume * self.vol * lerp;    
            }
            self.to_time--;
            if (self.to_time == 0)
            {
               self.pattern = self.to_pattern;
            }
         }
            
         // End
         
         if (self.paused)
         {
            right[i] = 0;
            left[i] = 0;
         }
         else
         {
            right[i] = main_output;
            left[i] = main_output;
            self.t += self.speed;
         }
      }
      
      if (self.increment_pattern_pos != 0  && Math.floor(self.t / 10000) > self.prev_pos) 
      {
         self.increment_pattern_pos();
         self.prev_pos++;
      }
   }
   
    node.onaudioprocess = function(e) {
        self.generateAudio(e);
    };
   
   this.soundAt = function(index)
   {
      var pat_pos = Math.floor(index / 10000);
      var ret = 0;
      var phase = index / sampleRate * 2 * Math.PI / self.speed;
      var numTracks = self.pattern.length;

      for (var track = 0; track < numTracks; track++)
      {
         var wave = self.pattern[track].instrument.waveform;
         
         var curpos = pat_pos % self.pattern[track].pattern.length;
         var note = self.pattern[track].pattern[curpos];
         // find nearest note played
         var temp = 1;
         while (note < 0 && temp < self.pattern[track].instrument.numsamples / 10000)
         {
            curpos--;
            if (curpos == -1) curpos = self.pattern[track].pattern.length - 1;
            
            note = self.pattern[track].pattern[curpos];
            temp++;
         }
         if (note < 0) continue;
         
         var freq = self.notes[note];
         
         ret += self.renderAudio(self.pattern[track].instrument, freq, index) * 
            self.pattern[track].instrument.volume * self.vol;     
      }
      
      
      return ret;
   }
}

var aud_vec2 = function(x, y)
{
    this.x = x;
   this.y = y;
}

function aud_region(x1, x2, y1, y2)
{
   this.x1 = x1;
   this.x2 = x2;
   this.y1 = y1;
   this.y2 = y2;
   
   this.Xvalue = function(r)
   {
      return r * (x2 - x1) + x1;
   }
   
   this.Yvalue = function(r)
   {
      return r * (y2 - y1) + y1;
   }
}
var rng = function(seed)
{
   this.seed = Math.floor(seed);
   this.MAX = 100000000;
   this.hike1 = Math.floor((10 - 9 * Math.cos(seed)) * 12345678);
   this.hike2 = Math.floor((10 - 9 * Math.sin(seed)) * 123456);
   this.prev = seed;
   var self = this;
   
   this.next = function()
   {
      var ret = self.prev;
      ret += self.hike1;
      ret += self.hike2;
      ret %= self.MAX;
      
      ret = ret << 3 ^ ret >> 3;
      ret %= self.MAX;
      
      self.prev = Math.floor(ret);
      return ret / self.MAX;
   }
}
   
var aud_instrument = function(len, smoothness, rand, noise, totallen, tocopy)
{
   this.noise = noise;
   this.numsamples = len;
   this.totallen = totallen;
   this.wave_pts = [new aud_vec2(0, 0), new aud_vec2(0.15, 0.5), new aud_vec2(0.3, 1), new aud_vec2(0.5, 0), 
      new aud_vec2(0.5, 0), new aud_vec2(0.5, 0), new aud_vec2(0.5, 0), new aud_vec2(0.5, 0),
      new aud_vec2(0.5, 0), new aud_vec2(0.5, 0), new aud_vec2(0.5, 0), new aud_vec2(0.5, 0),
      new aud_vec2(0.5, 0), new aud_vec2(0.5, 0), new aud_vec2(0.5, 0), new aud_vec2(0.5, 0), 
      new aud_vec2(0.5, 0), new aud_vec2(0.7, -1), new aud_vec2(0.85, -0.5), new aud_vec2(1, 0)];
   this.env_pts = [new aud_vec2(0, 0), new aud_vec2(0.2, 1), new aud_vec2(0.4, 0.5), 
      new aud_vec2(0.8, 0.5), new aud_vec2(1, 0)];
      
   this.LFOfreq = 3;
   this.LFOamp = 5;
   this.volume = 1;
   
   if (tocopy == 0)
   {
      var regionA = new aud_region(0.01 + (0.23 * smoothness), 0.49 - (0.23 * smoothness), 1, -0.5 + (1.45 * smoothness));
      var regionB = new aud_region(0.51 + (0.23 * smoothness), 0.99 - (0.23 * smoothness), 0.5 - (1.45 * smoothness), -1);
      for (var i = 1; i < this.wave_pts.length - 1; i++)
      {
         if (i < this.wave_pts.length / 2)
         {
            this.wave_pts[i].x = regionA.Xvalue(rand.next());
            this.wave_pts[i].y = regionA.Yvalue(rand.next());
         }
         else 
         {
            this.wave_pts[i].x = regionB.Xvalue(rand.next());
            this.wave_pts[i].y = regionB.Yvalue(rand.next());     
         }
      }
      /** now sort the points based on x **/
      for (var i = 1; i < this.wave_pts.length - 1; i++)
      {
         for (var j = i + 1; j < this.wave_pts.length - 1; j++)
         {
            if (this.wave_pts[i].x > this.wave_pts[j].x)
            {
               var temp = this.wave_pts[i].x;
               this.wave_pts[i].x = this.wave_pts[j].x;
               this.wave_pts[j].x = temp;
            }
         }
      }
      /** ensure sufficient space **/
      for (var i = 1; i < this.wave_pts.length - 1; i++)
      {
         if (this.wave_pts[i].x + 0.02 > this.wave_pts[i+1].x)
         {
            this.wave_pts[i+1].x += 0.02;
         }
      }
      
      var lowest = 1, highest = -1, hi = 0, li = 0;
      for (var i = 1; i < this.wave_pts.length - 1; i++)
      {
         if (this.wave_pts[i].y > highest)
         { highest = this.wave_pts[i].y; hi = i; }
         if (this.wave_pts[i].y < lowest)
         { lowest = this.wave_pts[i].y; li = i; }
      }
      this.wave_pts[hi].y = 1;
      this.wave_pts[li].y = -1;
      
      this.env_pts[1].y = 1;
      this.env_pts[2].y = rand.next() * 0.4 + 0.3;
      this.env_pts[3].y = this.env_pts[2].y;
      this.env_pts[1].x = rand.next() * 0.25;
      this.env_pts[2].x = rand.next() * 0.3 + this.env_pts[1].x;
      this.env_pts[3].x = rand.next() * 0.4 + 0.6;
      
      this.LFOfreq = rand.next() * 4 + 1;
      this.LFOamp = rand.next() * 12;
   }
   else
   {
      this.LFOfreq = tocopy.LFOfreq;
      this.LFOamp = tocopy.LFOamp;
      this.volume = tocopy.volume;
      
      this.env_pts = tocopy.env_pts;
      this.wave_pts = tocopy.wave_pts;
   }
}

var aud_pattern = new Array();
var aud_track = function(inst)
{
   this.velocities = new Array();
   this.pattern = new Array();
   this.instrument = inst;
}
   
var aud = new function()
{
   this.random;
   var self = this;
   
   this.ontick = 0;
   this.pattern = 0;
   this.pattern_position = 0;
   
   this.interf = new aud_interface();
   this.interf.increment_pattern_pos = function() {
      self.pattern_position++;
      if (self.ontick != 0)
      {
         self.pattern_position %= self.pattern[0].pattern.length;
         self.ontick();
      }
   }
   
   this.clear = function()
   {
      self.pattern = new Array();
            
      for (var i = 0; i < 18; i++)
      {
         // clear 18 instruments' worth of pattern out
         self.pattern.push(new aud_track('undefined'));//new aud_instrument(0, 10, 0, 0)));
         self.pattern[i].pattern[0] = -1;
      }
      
      self.interf.pattern = self.pattern;
   }
   
   this.togglePause = function()
   {
      self.interf.paused = !self.interf.paused;    
   }
   this.togglePlay = function()
   {
      self.interf.t = 0;
      self.pattern_position = 0;
      self.interf.prev_pos = 0;
      self.interf.paused = !self.interf.paused;
      if (self.ontick != 0) self.ontick();
   }
   this.isPlaying = function()
   {
      return !self.interf.paused;
   }
   this.setVolume = function(newvolume)
   {
      self.interf.vol = newvolume; 
   }
   
   this.LL = 0;
   this.LM = 1;
   this.LH = 2;
   this.ML = 3;
   this.MM = 4;
   this.HM = 5;
   this.HL = 6;
   this.HM = 7;
   this.HH = 8;
   this.joinMatrices = new Array();
   this.prevalenceArrays = new Array();
   
   this.joinMatrices[this.LL] = new Array(
      new Array(1.000,  0.000,   0.141,   0.236,   0.384,   0.332,   0.043,   0.263,   0.181,   0.318,   0.053,   0.054 ),
      new Array(0.000,  1.000,   0.006,   0.000,   0.009,   0.005,   0.000,   0.009,   0.053,   0.021,   0.079,   0.009 ),
      new Array(0.118,  0.083,   1.000,   0.019,   0.071,   0.192,   0.109,   0.151,   0.006,   0.130,   0.272,   0.310 ),
      new Array(0.037,  0.000,   0.009,   1.000,   0.000,   0.017,   0.167,   0.034,   0.138,   0.004,   0.073,   0.000 ),
      new Array(0.159,  0.026,   0.041,   0.000,   1.000,   0.050,   0.003,   0.157,   0.050,   0.066,   0.019,   0.125 ),
      new Array(0.211,  0.050,   0.174,   0.087,   0.052,   1.000,   0.000,   0.062,   0.095,   0.296,   0.221,   0.058 ),
      new Array(0.011,  0.000,   0.022,   0.019,   0.003,   0.000,   1.000,   0.011,   0.000,   0.033,   0.000,   0.021 ),
      new Array(0.171,  0.031,   0.165,   0.223,   0.267,   0.069,   0.047,   1.000,   0.069,   0.056,   0.163,   0.348 ),
      new Array(0.032,  0.099,   0.006,   0.116,   0.005,   0.033,   0.000,   0.006,   1.000,   0.000,   0.008,   0.014 ),
      new Array(0.190,  0.165,   0.136,   0.032,   0.069,   0.206,   0.211,   0.060,   0.000,   1.000,   0.112,   0.062 ),
      new Array(0.020,  0.171,   0.126,   0.101,   0.007,   0.048,   0.000,   0.066,   0.006,   0.024,   1.000,   0.000 ),
      new Array(0.052,  0.042,   0.173,   0.000,   0.132,   0.048,   0.253,   0.181,   0.069,   0.051,   0.000,   1.000 )
   );
   this.prevalenceArrays[this.LL] = new Array(0.184, 0.007, 0.098, 0.033, 0.079, 0.122, 0.025, 0.166, 0.031, 0.121, 0.088, 0.045);

   this.joinMatrices[this.LM] = new Array(
      new Array(1.000,  0.000,   0.170,   0.120,   0.212,   0.104,   0.113,   0.166,   0.076,   0.138,   0.106,   0.045 ),
      new Array(0.000,  1.000,   0.011,   0.002,   0.056,   0.035,   0.048,   0.014,   0.068,   0.081,   0.024,   0.005 ),
      new Array(0.118,  0.081,   1.000,   0.016,   0.038,   0.145,   0.119,   0.152,   0.060,   0.126,   0.113,   0.219 ),
      new Array(0.064,  0.002,   0.004,   1.000,   0.015,   0.013,   0.030,   0.014,   0.037,   0.039,   0.019,   0.000 ),
      new Array(0.226,  0.162,   0.032,   0.007,   1.000,   0.023,   0.009,   0.234,   0.064,   0.064,   0.010,   0.085 ),
      new Array(0.131,  0.064,   0.137,   0.079,   0.058,   1.000,   0.005,   0.115,   0.229,   0.292,   0.254,   0.150 ),
      new Array(0.021,  0.032,   0.068,   0.033,   0.014,   0.004,   1.000,   0.023,   0.013,   0.079,   0.029,   0.133 ),
      new Array(0.200,  0.003,   0.143,   0.019,   0.283,   0.128,   0.022,   1.000,   0.005,   0.054,   0.075,   0.267 ),
      new Array(0.041,  0.027,   0.078,   0.028,   0.037,   0.044,   0.019,   0.024,   1.000,   0.036,   0.018,   0.031 ),
      new Array(0.098,  0.167,   0.167,   0.064,   0.090,   0.094,   0.149,   0.069,   0.046,   1.000,   0.053,   0.062 ),
      new Array(0.070,  0.028,   0.090,   0.033,   0.021,   0.186,   0.034,   0.067,   0.141,   0.062,   1.000,   0.002 ),
      new Array(0.031,  0.033,   0.100,   0.000,   0.076,   0.023,   0.052,   0.121,   0.060,   0.028,   0.001,   1.000 )
   );
   this.prevalenceArrays[this.LM] = new Array(0.218, 0.016, 0.086, 0.033, 0.081, 0.125, 0.024, 0.169, 0.029, 0.106, 0.072, 0.041);

   this.joinMatrices[this.LH] = new Array(
      new Array(1.000,  0.003,   0.097,   0.083,   0.321,   0.181,   0.060,   0.222,   0.112,   0.292,   0.076,   0.061 ),
      new Array(0.000,  1.000,   0.002,   0.000,   0.013,   0.007,   0.018,   0.014,   0.000,   0.007,   0.007,   0.001 ),
      new Array(0.093,  0.029,   1.000,   0.059,   0.191,   0.192,   0.134,   0.210,   0.059,   0.140,   0.174,   0.290 ),
      new Array(0.035,  0.000,   0.042,   1.000,   0.001,   0.022,   0.004,   0.046,   0.106,   0.026,   0.060,   0.010 ),
      new Array(0.168,  0.080,   0.062,   0.004,   1.000,   0.041,   0.134,   0.236,   0.112,   0.069,   0.045,   0.074 ),
      new Array(0.227,  0.166,   0.241,   0.158,   0.042,   1.000,   0.009,   0.087,   0.109,   0.315,   0.243,   0.111 ),
      new Array(0.036,  0.012,   0.036,   0.002,   0.003,   0.001,   1.000,   0.002,   0.000,   0.035,   0.032,   0.001 ),
      new Array(0.155,  0.087,   0.153,   0.125,   0.246,   0.058,   0.027,   1.000,   0.008,   0.054,   0.076,   0.140 ),
      new Array(0.017,  0.000,   0.010,   0.069,   0.017,   0.031,   0.000,   0.001,   1.000,   0.004,   0.005,   0.026 ),
      new Array(0.186,  0.221,   0.134,   0.176,   0.075,   0.204,   0.073,   0.043,   0.019,   1.000,   0.031,   0.035 ),
      new Array(0.046,  0.022,   0.124,   0.046,   0.052,   0.121,   0.031,   0.081,   0.026,   0.033,   1.000,   0.000 ),
      new Array(0.037,  0.005,   0.098,   0.029,   0.040,   0.017,   0.009,   0.058,   0.198,   0.025,   0.000,   1.000 )
   );
   this.prevalenceArrays[this.LH] = new Array(0.211, 0.003, 0.127, 0.009, 0.111, 0.114, 0.008, 0.165, 0.009, 0.124, 0.073, 0.046);
   
   this.joinMatrices[this.ML] = new Array(
      new Array(1.000,  0.012,   0.091,   0.062,   0.221,   0.136,   0.061,   0.183,   0.062,   0.158,   0.068,   0.069 ),
      new Array(0.005,  1.000,   0.000,   0.017,   0.075,   0.088,   0.081,   0.016,   0.074,   0.060,   0.162,   0.047 ),
      new Array(0.074,  0.000,   1.000,   0.002,   0.039,   0.133,   0.118,   0.187,   0.089,   0.096,   0.090,   0.128 ),
      new Array(0.045,  0.014,   0.003,   1.000,   0.012,   0.044,   0.024,   0.083,   0.096,   0.016,   0.049,   0.049 ),
      new Array(0.148,  0.070,   0.053,   0.017,   1.000,   0.043,   0.007,   0.084,   0.042,   0.172,   0.006,   0.171 ),
      new Array(0.144,  0.202,   0.168,   0.084,   0.043,   1.000,   0.017,   0.077,   0.127,   0.099,   0.169,   0.092 ),
      new Array(0.008,  0.068,   0.062,   0.062,   0.019,   0.037,   1.000,   0.000,   0.187,   0.066,   0.040,   0.064 ),
      new Array(0.186,  0.105,   0.230,   0.104,   0.161,   0.084,   0.000,   1.000,   0.025,   0.086,   0.096,   0.216 ),
      new Array(0.064,  0.123,   0.107,   0.168,   0.080,   0.134,   0.066,   0.018,   1.000,   0.037,   0.030,   0.062 ),
      new Array(0.124,  0.128,   0.120,   0.023,   0.193,   0.095,   0.130,   0.061,   0.038,   1.000,   0.001,   0.076 ),
      new Array(0.032,  0.093,   0.086,   0.106,   0.036,   0.150,   0.134,   0.054,   0.081,   0.006,   1.000,   0.026 ),
      new Array(0.028,  0.042,   0.082,   0.069,   0.120,   0.056,   0.076,   0.093,   0.038,   0.060,   0.003,   1.000 )
   );
   this.prevalenceArrays[this.ML] = new Array(0.149, 0.044, 0.114, 0.064, 0.051, 0.099, 0.058, 0.131, 0.067, 0.102, 0.056, 0.064);

   this.joinMatrices[this.MH] = new Array(
      new Array(1.000,  0.010,   0.040,   0.165,   0.077,   0.106,   0.066,   0.100,   0.091,   0.140,   0.066,   0.018 ),
      new Array(0.010,  1.000,   0.055,   0.032,   0.060,   0.098,   0.147,   0.004,   0.152,   0.071,   0.183,   0.032 ),
      new Array(0.029,  0.008,   1.000,   0.065,   0.112,   0.102,   0.057,   0.225,   0.015,   0.045,   0.076,   0.040 ),
      new Array(0.156,  0.074,   0.040,   1.000,   0.012,   0.035,   0.079,   0.063,   0.190,   0.055,   0.102,   0.063 ),
      new Array(0.060,  0.046,   0.043,   0.013,   1.000,   0.014,   0.093,   0.022,   0.050,   0.099,   0.015,   0.116 ),
      new Array(0.129,  0.111,   0.112,   0.043,   0.036,   1.000,   0.026,   0.076,   0.096,   0.237,   0.091,   0.054 ),
      new Array(0.058,  0.148,   0.062,   0.181,   0.042,   0.017,   1.000,   0.017,   0.027,   0.048,   0.064,   0.148 ),
      new Array(0.101,  0.050,   0.222,   0.067,   0.096,   0.096,   0.035,   1.000,   0.015,   0.107,   0.113,   0.099 ),
      new Array(0.126,  0.113,   0.027,   0.169,   0.115,   0.079,   0.082,   0.015,   1.000,   0.011,   0.090,   0.038 ),
      new Array(0.075,  0.033,   0.023,   0.026,   0.056,   0.084,   0.021,   0.032,   0.050,   1.000,   0.010,   0.019 ),
      new Array(0.052,  0.111,   0.060,   0.090,   0.011,   0.066,   0.079,   0.141,   0.115,   0.014,   1.000,   0.010 ),
      new Array(0.020,  0.021,   0.044,   0.058,   0.111,   0.030,   0.132,   0.033,   0.019,   0.081,   0.007,   1.000 )
   );
   this.prevalenceArrays[this.MH] = new Array(0.161, 0.052, 0.082, 0.069, 0.053, 0.074, 0.042, 0.174, 0.073, 0.058, 0.117, 0.044);

   this.joinMatrices[this.MM] = new Array(
      new Array(1.000,  0.000,   0.066,   0.089,   0.042,   0.117,   0.004,   0.142,   0.019,   0.046,   0.067,   0.022 ),
      new Array(0.000,  1.000,   0.008,   0.023,   0.073,   0.074,   0.026,   0.002,   0.104,   0.037,   0.010,   0.029 ),
      new Array(0.131,  0.055,   1.000,   0.074,   0.093,   0.165,   0.120,   0.171,   0.132,   0.287,   0.193,   0.121 ),
      new Array(0.039,  0.020,   0.009,   1.000,   0.006,   0.020,   0.030,   0.037,   0.037,   0.015,   0.037,   0.024 ),
      new Array(0.085,  0.176,   0.072,   0.028,   1.000,   0.018,   0.054,   0.104,   0.023,   0.147,   0.037,   0.188 ),
      new Array(0.161,  0.037,   0.092,   0.082,   0.010,   1.000,   0.003,   0.061,   0.116,   0.086,   0.138,   0.011 ),
      new Array(0.013,  0.030,   0.089,   0.063,   0.021,   0.013,   1.000,   0.016,   0.004,   0.094,   0.000,   0.078 ),
      new Array(0.203,  0.005,   0.140,   0.102,   0.142,   0.111,   0.016,   1.000,   0.051,   0.096,   0.133,   0.103 ),
      new Array(0.010,  0.090,   0.041,   0.080,   0.013,   0.073,   0.002,   0.031,   1.000,   0.016,   0.028,   0.051 ),
      new Array(0.120,  0.166,   0.262,   0.059,   0.210,   0.126,   0.136,   0.138,   0.019,   1.000,   0.067,   0.081 ),
      new Array(0.044,  0.025,   0.139,   0.060,   0.103,   0.125,   0.000,   0.093,   0.073,   0.061,   1.000,   0.008 ),
      new Array(0.050,  0.038,   0.083,   0.055,   0.143,   0.015,   0.110,   0.061,   0.065,   0.045,   0.003,   1.000 )
   );
   this.prevalenceArrays[this.MM] = new Array(0.231, 0.024, 0.076, 0.079, 0.022, 0.103, 0.037, 0.209, 0.064, 0.041, 0.086, 0.026);

   this.joinMatrices[this.HL] = new Array(
      new Array(1.000,  0.000,   0.010,   0.000,   0.160,   0.155,   0.202,   0.146,   0.083,   0.142,   0.037,   0.034 ),
      new Array(0.000,  1.000,   0.027,   0.025,   0.047,   0.167,   0.037,   0.015,   0.067,   0.077,   0.128,   0.024 ),
      new Array(0.010,  0.014,   1.000,   0.012,   0.041,   0.154,   0.042,   0.044,   0.185,   0.014,   0.011,   0.063 ),
      new Array(0.000,  0.019,   0.018,   1.000,   0.028,   0.000,   0.063,   0.015,   0.038,   0.200,   0.044,   0.061 ),
      new Array(0.261,  0.070,   0.042,   0.018,   1.000,   0.039,   0.009,   0.286,   0.026,   0.165,   0.231,   0.289 ),
      new Array(0.101,  0.279,   0.119,   0.000,   0.013,   1.000,   0.016,   0.011,   0.068,   0.041,   0.202,   0.219 ),
      new Array(0.049,  0.061,   0.101,   0.127,   0.005,   0.041,   1.000,   0.035,   0.108,   0.046,   0.184,   0.051 ),
      new Array(0.104,  0.028,   0.050,   0.006,   0.260,   0.012,   0.012,   1.000,   0.000,   0.018,   0.050,   0.079 ),
      new Array(0.083,  0.100,   0.241,   0.025,   0.028,   0.077,   0.145,   0.000,   1.000,   0.015,   0.044,   0.086 ),
      new Array(0.122,  0.023,   0.027,   0.200,   0.092,   0.035,   0.012,   0.037,   0.010,   1.000,   0.022,   0.056 ),
      new Array(0.026,  0.165,   0.027,   0.237,   0.136,   0.142,   0.198,   0.075,   0.067,   0.033,   1.000,   0.040 ),
      new Array(0.044,  0.041,   0.138,   0.149,   0.190,   0.179,   0.063,   0.134,   0.149,   0.048,   0.049,   1.000 )
   );
   this.prevalenceArrays[this.HL] = new Array(0.194, 0.075, 0.078, 0.068, 0.085, 0.121, 0.033, 0.112, 0.082, 0.028, 0.066, 0.058);

   this.joinMatrices[this.HM] = new Array(
      new Array(1.000,  0.034,   0.074,   0.106,   0.079,   0.051,   0.197,   0.083,   0.104,   0.110,   0.053,   0.025 ),
      new Array(0.025,  1.000,   0.017,   0.061,   0.159,   0.273,   0.122,   0.231,   0.112,   0.153,   0.083,   0.067 ),
      new Array(0.044,  0.053,   1.000,   0.041,   0.017,   0.047,   0.098,   0.040,   0.174,   0.069,   0.100,   0.042 ),
      new Array(0.114,  0.063,   0.059,   1.000,   0.085,   0.095,   0.130,   0.129,   0.107,   0.140,   0.115,   0.064 ),
      new Array(0.060,  0.102,   0.049,   0.012,   1.000,   0.013,   0.049,   0.172,   0.023,   0.085,   0.129,   0.063 ),
      new Array(0.053,  0.029,   0.069,   0.022,   0.030,   1.000,   0.015,   0.014,   0.084,   0.120,   0.036,   0.100 ),
      new Array(0.196,  0.149,   0.219,   0.197,   0.086,   0.016,   1.000,   0.033,   0.043,   0.196,   0.091,   0.123 ),
      new Array(0.079,  0.225,   0.027,   0.030,   0.198,   0.011,   0.028,   1.000,   0.000,   0.059,   0.310,   0.096 ),
      new Array(0.103,  0.065,   0.131,   0.094,   0.045,   0.164,   0.038,   0.000,   1.000,   0.003,   0.018,   0.006 ),
      new Array(0.130,  0.157,   0.175,   0.137,   0.123,   0.209,   0.227,   0.078,   0.005,   1.000,   0.046,   0.074 ),
      new Array(0.011,  0.114,   0.105,   0.013,   0.114,   0.016,   0.048,   0.169,   0.010,   0.014,   1.000,   0.007 ),
      new Array(0.018,  0.009,   0.076,   0.120,   0.064,   0.104,   0.049,   0.052,   0.005,   0.050,   0.020,   1.000 )
   );
   this.prevalenceArrays[this.HM] = new Array(0.155, 0.045, 0.111, 0.113, 0.032, 0.061, 0.091, 0.206, 0.037, 0.067, 0.056, 0.025);
   
   this.joinMatrices[this.HH] = new Array(
      new Array(1.000,  0.058,   0.054,   0.118,   0.060,   0.127,   0.080,   0.155,   0.114,   0.139,   0.070,   0.069 ),
      new Array(0.018,  1.000,   0.025,   0.031,   0.056,   0.058,   0.061,   0.044,   0.071,   0.060,   0.047,   0.030 ),
      new Array(0.021,  0.016,   1.000,   0.099,   0.018,   0.154,   0.029,   0.121,   0.118,   0.144,   0.132,   0.117 ),
      new Array(0.132,  0.078,   0.086,   1.000,   0.069,   0.078,   0.149,   0.152,   0.113,   0.076,   0.206,   0.173 ),
      new Array(0.086,  0.083,   0.033,   0.035,   1.000,   0.011,   0.040,   0.087,   0.066,   0.039,   0.058,   0.080 ),
      new Array(0.106,  0.046,   0.119,   0.030,   0.022,   1.000,   0.038,   0.037,   0.103,   0.068,   0.093,   0.069 ),
      new Array(0.082,  0.117,   0.047,   0.133,   0.054,   0.056,   1.000,   0.047,   0.055,   0.108,   0.120,   0.138 ),
      new Array(0.147,  0.057,   0.125,   0.133,   0.080,   0.054,   0.031,   1.000,   0.033,   0.037,   0.084,   0.077 ),
      new Array(0.057,  0.112,   0.070,   0.072,   0.085,   0.119,   0.051,   0.029,   1.000,   0.071,   0.041,   0.057 ),
      new Array(0.099,  0.138,   0.103,   0.034,   0.054,   0.059,   0.070,   0.045,   0.045,   1.000,   0.023,   0.038 ),
      new Array(0.115,  0.103,   0.124,   0.172,   0.136,   0.104,   0.120,   0.145,   0.067,   0.066,   1.000,   0.075 ),
      new Array(0.062,  0.039,   0.137,   0.145,   0.134,   0.103,   0.101,   0.061,   0.062,   0.038,   0.050,   1.000 )
   );
   this.prevalenceArrays[this.HH] = new Array(0.211, 0.048, 0.056, 0.112, 0.066, 0.078, 0.055, 0.151, 0.081, 0.043, 0.067, 0.031);

   var lerp = function(min, max, val)
   {
      return (val - min) / (max - min);
   }
   var ilerp = function(min, max, val)
   {
      return 1 - (val - min) / (max - min);
   }
   
   this.createJMap = function(stress, energy)
   {
      var map = new Array();
      
      if (stress < 0.5)
      {
         for (i = 0; i < 12; i++)
         {
            map[i] = new Array();
            if (energy < 0.5)
            {
               for (j = 0; j < 12; j++)
               {
                  map[i][j] = ilerp(0, 0.5, stress) * ilerp(0, 0.5, energy) * aud.joinMatrices[aud.LL][i][j] + 
                     ilerp(0, 0.5, stress) * lerp(0, 0.5, energy) * aud.joinMatrices[aud.LM][i][j] + 
                     lerp(0, 0.5, stress) * ilerp(0, 0.5, energy) * aud.joinMatrices[aud.ML][i][j] + 
                     lerp(0, 0.5, stress) * lerp(0, 0.5, energy) * aud.joinMatrices[aud.MM][i][j];
               }
            }
            else // energy > 0.5
            {
               for (j = 0; j < 12; j++)
               {
                  map[i][j] = ilerp(0, 0.5, stress) * ilerp(0.5, 1, energy) * aud.joinMatrices[aud.LM][i][j] + 
                     ilerp(0, 0.5, stress) * lerp(0.5, 1, energy) * aud.joinMatrices[aud.LH][i][j] + 
                     lerp(0, 0.5, stress) * ilerp(0.5, 1, energy) * aud.joinMatrices[aud.MM][i][j] + 
                     lerp(0, 0.5, stress) * lerp(0.5, 1, energy) * aud.joinMatrices[aud.MH][i][j];
               }
            }
         }
      }
      else // stress > 0.5
      {
         for (i = 0; i < 12; i++)
         {
            map[i] = new Array();
            if (energy < 0.5)
            {
               for (j = 0; j < 12; j++)
               {
                  map[i][j] = ilerp(0.5, 1, stress) * ilerp(0, 0.5, energy) * aud.joinMatrices[aud.ML][i][j] + 
                     ilerp(0.5, 1, stress) * lerp(0, 0.5, energy) * aud.joinMatrices[aud.MM][i][j] + 
                     lerp(0.5, 1, stress) * ilerp(0, 0.5, energy) * aud.joinMatrices[aud.HL][i][j] + 
                     lerp(0.5, 1, stress) * lerp(0, 0.5, energy) * aud.joinMatrices[aud.HM][i][j];
               }
            }
            else // energy > 0.5
            {
               for (j = 0; j < 12; j++)
               {
                  map[i][j] = ilerp(0.5, 1, stress) * ilerp(0.5, 1, energy) * aud.joinMatrices[aud.MM][i][j] + 
                     ilerp(0.5, 1, stress) * lerp(0.5, 1, energy) * aud.joinMatrices[aud.MH][i][j] + 
                     lerp(0.5, 1, stress) * ilerp(0.5, 1, energy) * aud.joinMatrices[aud.HM][i][j] + 
                     lerp(0.5, 1, stress) * lerp(0.5, 1, energy) * aud.joinMatrices[aud.HH][i][j];
               }
            }
         }
      }

      return map;
   }
   this.createPMap = function(stress, energy)
   {
      var map = new Array();
      
      if (stress < 0.5)
         if (energy < 0.5)
         {
            for (var i = 0; i < 12; i++)
            {
               map[i] = ilerp(0, 0.5, stress) * ilerp(0, 0.5, energy) * aud.prevalenceArrays[aud.LL][i] + 
                     ilerp(0, 0.5, stress) * lerp(0, 0.5, energy) * aud.prevalenceArrays[aud.LM][i] + 
                     lerp(0, 0.5, stress) * ilerp(0, 0.5, energy) * aud.prevalenceArrays[aud.ML][i] + 
                     lerp(0, 0.5, stress) * lerp(0, 0.5, energy) * aud.prevalenceArrays[aud.MM][i];
            }
         }
         else
         {
            for (var i = 0; i < 12; i++)
            {
               map[i] = ilerp(0, 0.5, stress) * ilerp(0.5, 1, energy) * aud.prevalenceArrays[aud.LM][i] + 
                     ilerp(0, 0.5, stress) * lerp(0.5, 1, energy) * aud.prevalenceArrays[aud.LH][i] + 
                     lerp(0, 0.5, stress) * ilerp(0.5, 1, energy) * aud.prevalenceArrays[aud.MM][i] + 
                     lerp(0, 0.5, stress) * lerp(0.5, 1, energy) * aud.prevalenceArrays[aud.MH][i];
            }
         
         }
      else
      {
         if (energy < 0.5)
         {
            for (var i = 0; i < 12; i++)
            {
               map[i] = ilerp(0.5, 1, stress) * ilerp(0, 0.5, energy) * aud.prevalenceArrays[aud.ML][i] + 
                     ilerp(0.5, 1, stress) * lerp(0, 0.5, energy) * aud.prevalenceArrays[aud.MM][i] + 
                     lerp(0.5, 1, stress) * ilerp(0, 0.5, energy) * aud.prevalenceArrays[aud.HL][i] + 
                     lerp(0.5, 1, stress) * lerp(0, 0.5, energy) * aud.prevalenceArrays[aud.HM][i];
            }
         }
         else
         {
            for (var i = 0; i < 12; i++)
            {
               map[i] = ilerp(0.5, 1, stress) * ilerp(0.5, 1, energy) * aud.prevalenceArrays[aud.MM][i] + 
                     ilerp(0.5, 1, stress) * lerp(0.5, 1, energy) * aud.prevalenceArrays[aud.MH][i] + 
                     lerp(0.5, 1, stress) * ilerp(0.5, 1, energy) * aud.prevalenceArrays[aud.HM][i] + 
                     lerp(0.5, 1, stress) * lerp(0.5, 1, energy) * aud.prevalenceArrays[aud.HH][i];
            }
         }
      }
      return map;
   }
   
   this.createTriJMap = function(stress, energy)
   {
      var map = new Array();
      
      if (stress < 0.5)
      {
         for (i = 0; i < 12; i++)
         {
            map[i] = new Array();
            for (j = 0; j < 12; j++)
            {
               map[i][j] = ilerp(0, 0.5, stress) * ilerp(0.5, 1, energy) * aud.joinMatrices[aud.LM][i][j] + 
                  ilerp(0, 0.5, stress) * lerp(0.5, 1, energy) * aud.joinMatrices[aud.LH][i][j] + 
                  lerp(0, 0.5, stress) * ilerp(0.5, 1, energy) * aud.joinMatrices[aud.MM][i][j] + 
                  lerp(0, 0.5, stress) * lerp(0.5, 1, energy) * aud.joinMatrices[aud.MH][i][j];
            }
         }
      }
      else // stress > 0.5
      {
         for (i = 0; i < 12; i++)
         {
            map[i] = new Array();
            
            for (j = 0; j < 12; j++)
            {
               map[i][j] = ilerp(0.5, 1, stress) * ilerp(0.5, 1, energy) * aud.joinMatrices[aud.MM][i][j] + 
                  ilerp(0.5, 1, stress) * lerp(0.5, 1, energy) * aud.joinMatrices[aud.MH][i][j] + 
                  lerp(0.5, 1, stress) * ilerp(0.5, 1, energy) * aud.joinMatrices[aud.HM][i][j] + 
                  lerp(0.5, 1, stress) * lerp(0.5, 1, energy) * aud.joinMatrices[aud.HH][i][j];
            }
         }
      }

      return map;
   }
   this.createTriPMap = function(stress, energy)
   {
      var map = new Array();
      
      if (stress < 0.5)
         for (var i = 0; i < 12; i++)
         {
            map[i] = ilerp(0, 0.5, stress) * ilerp(0.5, 1, energy) * aud.prevalenceArrays[aud.LM][i] + 
                  ilerp(0, 0.5, stress) * lerp(0.5, 1, energy) * aud.prevalenceArrays[aud.LH][i] + 
                  lerp(0, 0.5, stress) * ilerp(0.5, 1, energy) * aud.prevalenceArrays[aud.MM][i] + 
                  lerp(0, 0.5, stress) * lerp(0.5, 1, energy) * aud.prevalenceArrays[aud.MH][i];
         }
      else
      {
         for (var i = 0; i < 12; i++)
         {
            map[i] = ilerp(0.5, 1, stress) * ilerp(0.5, 1, energy) * aud.prevalenceArrays[aud.MM][i] + 
                  ilerp(0.5, 1, stress) * lerp(0.5, 1, energy) * aud.prevalenceArrays[aud.MH][i] + 
                  lerp(0.5, 1, stress) * ilerp(0.5, 1, energy) * aud.prevalenceArrays[aud.HM][i] + 
                  lerp(0.5, 1, stress) * lerp(0.5, 1, energy) * aud.prevalenceArrays[aud.HH][i];
         }
      }
      return map;
   }
      
   this.populate_perc = function (stress, energy, pat, patlen, transitions)
   {  
      // two percussive instruments
      // snare - kick
      self.pattern.push(new aud_track(new aud_instrument(2000, 0.85 - energy * 0.8, self.random, true, 10000, 0)));
      // hat
      self.pattern.push(new aud_track(new aud_instrument(10000 + (1 - stress) * 8000, 0.85 - energy * 0.8, self.random, true, 20000, 0)));
      self.pattern[0].instrument.volume = 0.2 + energy * 0.25 + stress * 0.2;
      self.pattern[1].instrument.volume = 0.1 + energy * 0.2 + stress * 0.1;
   
      for (var p = 0; p < pat; p++)
      {     
         for (var pl = 0; pl < patlen; pl++)
         {
            var pat_pos = p * patlen * 32 + pl * 32;
            if (pl == 0)
            {
               for (var i = 0; i < 32; i++)
               {
                  var tenergy = energy;
                  if (patlen == 1 && i > 32 - 8)
                  {
                     if (transitions[p] == "low")
                        tenergy = energy * energy * energy;
                     else 
                        tenergy = Math.sqrt(Math.sqrt(energy));
                  }
               
                  self.pattern[0].pattern[pat_pos + i] = -1;
                  self.pattern[1].pattern[pat_pos + i] = -1;
               
                  var r1 = self.random.next();
                  var r2 = self.random.next();
                  
                  if (i % 8 == 0) 
                  {
                     if (r1 > 0.02)
                        self.pattern[0].pattern[pat_pos + i] = 0;
                     if (r2 - tenergy / 4 > 0.6)
                        self.pattern[1].pattern[pat_pos + i] = 0;
                  }
                  else if (i % 4 == 0)
                  {
                     if (r1 > 0.1 && tenergy + r1 > 0.6)
                        self.pattern[0].pattern[pat_pos + i] = 0;
                     if (r2 - tenergy / 4 > 0.5)
                        self.pattern[1].pattern[pat_pos + i] = 0;
                  }
                  else if (i % 2 == 0)
                  {
                     if (tenergy + r1 > 0.9)
                        self.pattern[0].pattern[pat_pos + i] = 0;
                  }
                  else
                  {
                     if (r1 > 0.75 && tenergy > 0.75)
                        self.pattern[0].pattern[pat_pos + i] = 0;
                  }
               }
            }
            else // copy
            {
               if (pl < patlen - 1)
               {
                  for (var i = 0; i < 32; i++)
                  {
                     self.pattern[0].pattern[pat_pos + i] = self.pattern[0].pattern[pat_pos + i - 32];
                     self.pattern[1].pattern[pat_pos + i] = self.pattern[1].pattern[pat_pos + i - 32];
                  }
               }
               else
               {
                  for (var i = 0; i < 32 - 8; i++)
                  {
                     self.pattern[0].pattern[pat_pos + i] = self.pattern[0].pattern[pat_pos + i - 32];
                     self.pattern[1].pattern[pat_pos + i] = self.pattern[1].pattern[pat_pos + i - 32];
                  }
                  var tenergy = energy;
                  if (transitions[p] == "low")
                     tenergy = energy * energy * energy;
                  else 
                     tenergy = Math.sqrt(Math.sqrt(energy));
                  // design transition
                  for (var i = 32 - 8; i < 32; i++)
                  {
                     self.pattern[0].pattern[pat_pos + i] = -1;
                     self.pattern[1].pattern[pat_pos + i] = -1;
                     var r1 = self.random.next();
                     var r2 = self.random.next();
                  
                     if (i % 8 == 0)
                     {
                        if (r1 > 0.02)
                           self.pattern[0].pattern[pat_pos + i] = 0;
                        if (r2 > 0.5)
                           self.pattern[1].pattern[pat_pos + i] = 0;
                     }
                     else if (i % 4 == 0)
                     {
                        if (r1 > 0.1 && tenergy + r1 > 0.6)
                           self.pattern[0].pattern[pat_pos + i] = 0;
                        if (r2 > 0.6 && tenergy > 0.5)
                           self.pattern[1].pattern[pat_pos + i] = 0;
                     }
                     else if (i % 2 == 0)
                     {
                        if (tenergy + r1 > 0.9)
                           self.pattern[0].pattern[pat_pos + i] = 0;
                     }
                     else
                     {
                        if (tenergy + r1 > 1)
                           self.pattern[0].pattern[pat_pos + i] = 0;
                     }
                  }
               }
            }
         }
      }
   }
   
   this.canUse = function(map, note, refnote, cutoff)
   {
      if (map[note][refnote] > cutoff)
         return true;
      return false;
   }
   
   this.getJoiningNotes = function(pat_pos, instr_no)
   {
      var ret = new Array();
      
      for (var i = 2; i < aud.pattern.length; i++)
      {
         if (i == instr_no)
            continue;
         if ((i - 2) % 4 == 0)
         {
            if (aud.pattern[i].pattern[pat_pos - pat_pos % 8] != -1)
            {
               ret.push(aud.pattern[i].pattern[pat_pos - pat_pos % 8]);
            }
         }
         else if ((i - 2) % 4 == 1)
         {
            if (aud.pattern[i].pattern[pat_pos - pat_pos % 4] != -1)
            {
               ret.push(aud.pattern[i].pattern[pat_pos - pat_pos % 4]);
            }
         }
         else if ((i - 2) % 4 == 2)
         {
            if (aud.pattern[i].pattern[pat_pos - pat_pos % 2] != -1)
            {
               ret.push(aud.pattern[i].pattern[pat_pos - pat_pos % 2]);
            }
         }
         else if ((i - 2) % 4 == 3)
         {
            if (aud.pattern[i].pattern[pat_pos] != -1)
            {
               ret.push(aud.pattern[i].pattern[pat_pos]);
            }
         }
      }
      
      return ret;
   }
      
   this.usableNotes = function(notesToJoin, Jmap, base_note, cutoff, expand)
   {
      var avail = new Array(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
      
      for (var i = 0; i < notesToJoin.length; i++)
      {
         notesToJoin[i] -= (base_note % 12);
         notesToJoin[i] %= 12;
         
         for (var j = 0; j < avail.length; j++)
         {
            if (!self.canUse(Jmap, avail[j], notesToJoin[i], cutoff))
            {
               avail.splice(j, 1);
               j--;
            }
         }        
      }
      if (avail.indexOf(0) != -1)
         avail.push(12);
      if (expand)
      {
         if (avail.indexOf(1) != -1)
            avail.push(13);
         if (avail.indexOf(2) != -1)
            avail.push(14);
         if (avail.indexOf(3) != -1)
            avail.push(15);
         if (avail.indexOf(4) != -1)
            avail.push(16);
         if (avail.indexOf(5) != -1)
            avail.push(17);
         if (avail.indexOf(6) != -1)
            avail.push(18);
         if (avail.indexOf(7) != -1)
            avail.push(19);
      }
      for (var i = 0; i < avail.length; i++)
      {
         avail[i] += base_note;
      }
      if (avail.length == 0 && notesToJoin.length != 0)
         for (var i = 0; i < notesToJoin.length; i++)
         {
            avail.push(notesToJoin[i] + base_note);
         }
      return avail;
   }
   
   this.pickNoteFromUsable = function(Pmap, n, rand, base_note, cutoff)
   {
      if (n.length == 0) return -1;
      
      var nt = -1, nt_r = rand;
      var prev = new Array(), pntot = 0;
      for (var pnt = 0; pnt < n.length; pnt++)
      {
         prev.push(Pmap[(n[pnt] - base_note) % 12]);
         pntot += Pmap[(n[pnt] - base_note) % 12];
      }
      if (pntot > 0)
      {
         for (var pnt = 0; pnt < prev.length; pnt++)
         {
            prev[pnt] /= pntot; 
         }
      }     
      
      do
      {
         nt++;
         nt_r -= prev[nt];
      } while(nt_r > 0 || prev[nt] < cutoff);
      
      if (nt >= n.length) return -1;
      
      return n[nt];
   }
   
   this.populate_melody = function (stress, energy, pat, patlen, transitions, Jmap, Pmap, base_note, n_instr, instr_arr, n_tracks, fwd_arr)
   {
      var a = self.pattern.length;
      var b = self.pattern.length + 1;
      var c = self.pattern.length + 2;
      var d = self.pattern.length + 3;    
      
      var v = 0.4 - 0.05 * energy - 0.05 * stress;
      var tempinstr = new aud_instrument(80000, 0.75 - stress * 0.2 - energy * 0.2, self.random, false, 80000, 0);
      self.pattern.push(new aud_track(tempinstr));
      self.pattern.push(new aud_track(new aud_instrument(40000, 0.95, self.random, false, 40000, tempinstr)));
      self.pattern.push(new aud_track(new aud_instrument(20000, 0.95, self.random, false, 20000, tempinstr)));
      self.pattern.push(new aud_track(new aud_instrument(10000, 0.95, self.random, false, 10000, tempinstr)));
      self.pattern[a].instrument.volume = v;
      self.pattern[b].instrument.volume = v;
      self.pattern[c].instrument.volume = v;
      self.pattern[d].instrument.volume = v;
      
      for (var p = 0; p < pat; p++)
      {     
         var sp_r = self.random.next();
      
         var shouldplay = instr_arr[p][n_instr];
         var shouldclear = true;
         if (fwd_arr[p][n_instr] != -1)
         {
            var ndxpos = fwd_arr[p][n_instr] * patlen * 32;
            var pos = p * patlen * 32;
            for ( ; pos < (p + 1) * 32 * patlen; pos++, ndxpos++)
            {
               self.pattern[a].pattern[pos] = self.pattern[a].pattern[ndxpos];
               self.pattern[b].pattern[pos] = self.pattern[b].pattern[ndxpos];
               self.pattern[c].pattern[pos] = self.pattern[c].pattern[ndxpos];
               self.pattern[d].pattern[pos] = self.pattern[d].pattern[ndxpos];   
            }
            
            shouldplay = false;
            shouldclear = false;
         }
            
         var instr_fractals = [0.3, 0.5, 0.7];  
         var noteplay_fractals = [0.05, 0.4, 0.6, 0.9];
         var joinlimit_fractals = [0.2, 0.15, 0.08, 0.04];
         var prevalence_fractals = [0.12, 0.05, 0.03, 0.02];
         
         var t_n_tracks = n_tracks;
         var tempnum = 0;
         
         for (var tempndx = 0; tempndx < 4; tempndx++)
         {
            if (instr_arr[p][tempndx])
               tempnum++;
         }
         if (tempnum <= 1 && t_n_tracks <= 2) 
         {
            t_n_tracks = 3;
         }
         
         var renergy = energy + (self.random.next() - 0.5) * 1.0;
         for (var pl = 0; pl < patlen; pl++)
         {
            var pat_pos = p * patlen * 32 + pl * 32;
            
            if (pl == 0)
            {           
               for (var i = 0; i < 32; i++)
               {
                  var tenergy = energy;
                  var trenergy = renergy;
                  
                  if (patlen == 1 && i > 32 - 8)
                  {
                     if (transitions[p] == "low")
                     {
                        tenergy = energy * energy * energy - 0.2;
                        trenergy = renergy * renergy * renergy - 0.2;
                     }
                     else
                     {
                        tenergy = Math.sqrt(Math.sqrt(energy)) + 0.2;
                        trenergy = Math.sqrt(Math.sqrt(renergy)) + 0.2;
                     }
                  }
                  if (n_instr == 0)
                  {
                     tenergy /= 1.5;
                     trenergy /= 1.5;
                  }
                  
                  if (shouldclear)
                  {
                     self.pattern[a].pattern[pat_pos + i] = -1;
                     self.pattern[b].pattern[pat_pos + i] = -1;
                     self.pattern[c].pattern[pat_pos + i] = -1;
                     self.pattern[d].pattern[pat_pos + i] = -1;
                  }
                  
                  var r1 = self.random.next();
                  var r2 = self.random.next();
                  var r3 = self.random.next();
                  var r4 = self.random.next();
                  var r5 = self.random.next();
                  var r6 = self.random.next();
                  var r7 = self.random.next();
                  var r8 = self.random.next();
                  
                  if (!shouldplay)
                     continue;
                  
                  if (i % 8 == 0 && (trenergy < instr_fractals[0] || (t_n_tracks >= 3 && trenergy < instr_fractals[1])))
                  {
                     if (r1 + tenergy > noteplay_fractals[0])
                     {
                        var ntj = aud.getJoiningNotes(pat_pos + i, a);
                        var n = self.usableNotes(ntj, Jmap, base_note, joinlimit_fractals[0], false);
                        self.pattern[a].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r5, base_note, prevalence_fractals[0]);
                     }
                  }
                  if (i % 4 == 0 && 
                     (t_n_tracks >= 3 || (trenergy > instr_fractals[0] && trenergy < instr_fractals[2]) || (trenergy < instr_fractals[1])))
                  {
                     if (r2 + tenergy > noteplay_fractals[1])
                     {
                        var ntj = aud.getJoiningNotes(pat_pos + i, b);
                        var n = self.usableNotes(ntj, Jmap, base_note, joinlimit_fractals[1], true);
                        self.pattern[b].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r6, base_note, prevalence_fractals[1]);
                     }
                  }
                  if (i % 2 == 0 && 
                     (t_n_tracks >= 3 || (trenergy > instr_fractals[0] && trenergy < instr_fractals[2]) || (trenergy > instr_fractals[1])))
                  {
                     if (r3 + tenergy > noteplay_fractals[2])
                     {
                        var ntj = aud.getJoiningNotes(pat_pos + i, c);
                        var n = self.usableNotes(ntj, Jmap, base_note, joinlimit_fractals[2], true);
                        self.pattern[c].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r7, base_note, prevalence_fractals[2]);
                     }
                  }
                  if (i % 1 == 0 && (trenergy > instr_fractals[2] || (t_n_tracks >= 3 && trenergy > instr_fractals[1])))
                  {
                     if (r4 + tenergy > noteplay_fractals[3])
                     {
                        var ntj = aud.getJoiningNotes(pat_pos + i, d);
                        var n = self.usableNotes(ntj, Jmap, base_note, joinlimit_fractals[3], true);
                        self.pattern[d].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r8, base_note, prevalence_fractals[3]);
                     }
                  }
               }
            }
            else // copy
            {
               var variance = 0;
               
               if (patlen % 2 == 0)
               {
                  if (pl / patlen < 0.5) 
                     variance = 0.3; // first half
                  else
                     variance = 0.1; // second half
               }
               else
               {
                  if (pl % 2 == 1 && pl < 4)
                     variance = 0.3; // B & C
                  else
                     variance = 0.1;
               }
               
               if (pl < patlen - 1)
               {
                  if (shouldclear)
                  {
                     var copyfrom;
                     if (patlen % 2 == 0)
                     {
                        if (pl / patlen < 0.5)
                           copyfrom = pl;
                        else
                           copyfrom = Math.floor(patlen / 2);
                     }
                     else
                     {
                        if (pl < 4)
                           copyfrom = pl;
                        else if (patlen == 5 && pl == 4)
                           copyfrom = 2;
                        else if (pl == 4)
                           copyfrom = 3;
                        else if (pl == 5)
                           copyfrom = 2;
                        else if (pl == 6)
                           copyfrom = 4;                          
                     }
                  
                     for (var i = 0; i < 32; i++)
                     {
                        var r1 = self.random.next();
                        var r2 = self.random.next();
                        var r3 = self.random.next();
                        var r4 = self.random.next();
                        var r5 = self.random.next();
                        var r6 = self.random.next();
                        var r7 = self.random.next();
                        var r8 = self.random.next();
                        
                        self.pattern[a].pattern[pat_pos + i] = self.pattern[a].pattern[pat_pos + i - 32 * copyfrom];
                        self.pattern[b].pattern[pat_pos + i] = self.pattern[b].pattern[pat_pos + i - 32 * copyfrom];
                        self.pattern[c].pattern[pat_pos + i] = self.pattern[c].pattern[pat_pos + i - 32 * copyfrom];
                        self.pattern[d].pattern[pat_pos + i] = self.pattern[d].pattern[pat_pos + i - 32 * copyfrom];
                        
                        if (self.pattern[a].pattern[pat_pos + i] != -1 && r1 < variance - 0.1)
                        {
                           var ntj = aud.getJoiningNotes(pat_pos + i, a);
                           var n = self.usableNotes(ntj, Jmap, base_note, 0.10, false);
                           self.pattern[a].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r5, base_note, 0.05);
                        }
                        if (self.pattern[b].pattern[pat_pos + i] != -1 && r2 < variance)
                        {
                           var ntj = aud.getJoiningNotes(pat_pos + i, b);
                           var n = self.usableNotes(ntj, Jmap, base_note, 0.08, false);
                           self.pattern[b].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r6, base_note, 0.04);
                        }
                        if (self.pattern[c].pattern[pat_pos + i] != -1 && r3 < variance + 0.1)
                        {
                           var ntj = aud.getJoiningNotes(pat_pos + i, c);
                           var n = self.usableNotes(ntj, Jmap, base_note, 0.05, false);
                           self.pattern[c].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r7, base_note, 0.02);
                        }
                        if (self.pattern[d].pattern[pat_pos + i] != -1 && r4 < variance + 0.2)
                        {
                           var ntj = aud.getJoiningNotes(pat_pos + i, d);
                           var n = self.usableNotes(ntj, Jmap, base_note, 0.03, false);
                           self.pattern[d].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r8, base_note, 0.02);
                        }
                     }
                  }
               }
               else
               {
                  if (shouldclear)
                  {
                     var copyfrom;
                     if (patlen % 2 == 0)
                     {
                        copyfrom = Math.floor(patlen / 2);
                     }
                     else
                     {
                        if (patlen == 3)
                           copyfrom = 2;
                        else 
                           copyfrom = pl - 2;
                     } 
                  
                     for (var i = 0; i < 32 - 8; i++)
                     {
                        var r1 = self.random.next();
                        var r2 = self.random.next();
                        var r3 = self.random.next();
                        var r4 = self.random.next();
                        var r5 = self.random.next();
                        var r6 = self.random.next();
                        var r7 = self.random.next();
                        var r8 = self.random.next();
                  
                        self.pattern[a].pattern[pat_pos + i] = self.pattern[a].pattern[pat_pos + i - 32 * copyfrom];
                        self.pattern[b].pattern[pat_pos + i] = self.pattern[b].pattern[pat_pos + i - 32 * copyfrom];
                        self.pattern[c].pattern[pat_pos + i] = self.pattern[c].pattern[pat_pos + i - 32 * copyfrom];
                        self.pattern[d].pattern[pat_pos + i] = self.pattern[d].pattern[pat_pos + i - 32 * copyfrom];
                     }
                  }
                  
                  var tenergy = energy;
                  var trenergy = renergy;
                  if (transitions[p] == "low")
                  {
                     tenergy = energy * energy * energy - 0.2;
                     trenergy = renergy * renergy * renergy - 0.2;
                  }
                  else
                  {
                     tenergy = Math.sqrt(Math.sqrt(energy)) + 0.2;
                     trenergy = Math.sqrt(Math.sqrt(renergy)) + 0.2;
                  }
                  if (n_instr == 0)
                  {
                     tenergy /= 1.5;
                     trenergy /= 1.5;
                  }
                  // design transition
                  for (var i = 32 - 8; i < 32; i++)
                  {
                     if (shouldclear)
                     {
                        self.pattern[a].pattern[pat_pos + i] = -1;
                        self.pattern[b].pattern[pat_pos + i] = -1;
                        self.pattern[c].pattern[pat_pos + i] = -1;
                        self.pattern[d].pattern[pat_pos + i] = -1;
                     }
                     var r1 = self.random.next();
                     var r2 = self.random.next();
                     var r3 = self.random.next();
                     var r4 = self.random.next();
                     var r5 = self.random.next();
                     var r6 = self.random.next();
                     var r7 = self.random.next();
                     var r8 = self.random.next();
                  
                     if (!shouldplay)
                        continue;
                     // aqui
                     if (i % 8 == 0 && (trenergy < 0.3 || (n_tracks >= 3 && trenergy < 0.5)))
                     {
                        if (r1 + tenergy > 0.1)
                        {
                           var ntj = aud.getJoiningNotes(pat_pos + i, a);
                           var n = self.usableNotes(ntj, Jmap, base_note, 0.12, false);
                           self.pattern[a].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r5, base_note, 0.06);
                        }
                     }
                     if (i % 4 == 0 && (n_tracks >= 3 || (trenergy > 0.3 && trenergy < 0.7) || (trenergy < 0.5)))
                     {
                        if (r2 + tenergy > 0.4)
                        {
                           var ntj = aud.getJoiningNotes(pat_pos + i, b);
                           var n = self.usableNotes(ntj, Jmap, base_note, 0.09, true);
                           self.pattern[b].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r6, base_note, 0.03);
                        }
                     }
                     if (i % 2 == 0 && (n_tracks >= 3 || (trenergy > 0.3 && trenergy < 0.7) || (trenergy > 0.5)))
                     {
                        if (r3 + tenergy > 0.6)
                        {
                           var ntj = aud.getJoiningNotes(pat_pos + i, c);
                           var n = self.usableNotes(ntj, Jmap, base_note, 0.05, true);
                           self.pattern[c].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r7, base_note, 0.02);
                        }
                     }
                     if (i % 1 == 0 && (trenergy > 0.7 || (n_tracks >= 3 && trenergy > 0.5)))
                     {
                        if (r4 + tenergy > 0.9)
                        {
                           var ntj = aud.getJoiningNotes(pat_pos + i, d);
                           var n = self.usableNotes(ntj, Jmap, base_note, 0.03, true);
                           self.pattern[d].pattern[pat_pos + i] = aud.pickNoteFromUsable(Pmap, n, r8, base_note, 0.02);
                        }
                     }
                     // jusqu'ici
                  }
               }  
            }
         }
         
         // consume more random numbers to compensate for # over repeats - consume numbers equivalent to 8 repeats 
         for (var tmp = 0; tmp < (8 - patlen) * 32 * 8 ; tmp++) 
            self.random.next();
      }
   }
   
   
   var aud_pat = 1, aud_seed = 0, aud_patlen = 4; 
   this.getNumSamples = function()
   {
      return 10000 * 32 * self.aud_patlen * self.aud_pat;
   }
   
   var has_gen = false;
   var assure_instr = function(energy, array, no)
   {
      var num = 0;
      for (var t = 0; t < 4; t++)
      {
         if (array[no][t])
            num++;
      }
      
      if (energy < 0.3 && num < 1)
      {
         if (no % 2 == 0)
            array[no][0] = true;
         else
            array[no][1] = true;
      }
      if (energy > 0.3 && num < 2)
      {
         if (num == 0)
         {
            if (no % 2 == 0)
            {
               array[no][0] = true;
               if (no % 3 == 0)
                  array[no][1] = true;
               else 
                  array[no][2] = true;
            }
            else
            {
               array[no][1] = true;
               if (no % 3 == 0)
                  array[no][0] = true;
               else 
                  array[no][2] = true;
            }
         }
         else
         {
            if (!array[no][0])
               array[no][0] = true;
            else
               array[no][1] = true;
         }
      }  
      if (num > 3)
      {
         if (no % 2 == 0)
            array[no][2] = false;
         else
            array[no][3] = false;
      }
      if (energy < 0.5 && num > 2)
      {
         if (array[no][3])
            array[no][3] = false;
         else if (no % 2 == 0)
            array[no][2] = false;
         else 
            array[no][0] = false;
      }
      return array;
   }
   var populate_instr = function(energy, pat, array)
   {
      var howlong = new Array(0,0,0,0);
      array[0] = new Array();
      
      array[0][0] = self.random.next() < 0.5 + energy * 0.2;
      array[0][1] = self.random.next() < 0.4 + energy * 0.2;
      array[0][2] = self.random.next() < 0.3 + energy * 0.2;
      array[0][3] = self.random.next() < 0.3 + energy * 0.1;
      
      array = assure_instr(energy, array, 0);
      
      for (var i = 1; i < pat; i++)
      {
         array[i] = new Array();
         array[i][0] = self.random.next() < 0.4 + energy * 0.2 - howlong[0] * 0.2;
         if (array[i][0]) howlong[0]++; else howlong[0] = 0; 
         array[i][1] = self.random.next() < 0.4 + energy * 0.2 - howlong[1] * 0.2;
         if (array[i][1]) howlong[1]++; else howlong[1] = 0; 
         array[i][2] = self.random.next() < 0.4 + energy * 0.2 - howlong[2] * 0.2;
         if (array[i][2]) howlong[2]++; else howlong[2] = 0; 
         array[i][3] = self.random.next() < 0.4 + energy * 0.2 - howlong[3] * 0.2;  
         if (array[i][3]) howlong[3]++; else howlong[3] = 0; 
         
         array = assure_instr(energy, array, i);
      }
   }
   var populate_fwd = function(instr_arr, pat)
   {
      var aseen = false, bseen = false, cseen = false, dseen = false;
      var fwd_arr = new Array();
      
      for (var i = 0; i < pat; i++)
      {
         fwd_arr[i] = new Array();
         
         for (var j = 0; j < 4; j++)
         {
            fwd_arr[i][j] = - 1;
         }
      }
      
      for (var i = 0; i < pat - 1; i++)
      {
         for (var j = 0; j < 4; j++)
         {
            var rand = self.random.next();
            var rarr = new Array(self.random.next(),self.random.next(),self.random.next());
            if (instr_arr[i][j] && rand < 0.7)
            {
               for (var ti = i + 1, ndx = 0; ti < pat && ndx < 3; ti++)
               {
                  if (instr_arr[ti][j] && 
                     (fwd_arr[ti][0] == -1 || fwd_arr[ti][0] == i) && 
                     (fwd_arr[ti][1] == -1 || fwd_arr[ti][1] == i) && 
                     (fwd_arr[ti][2] == -1 || fwd_arr[ti][2] == i) && 
                     (fwd_arr[ti][3] == -1 || fwd_arr[ti][3] == i) && 
                     (!instr_arr[ti][0] || fwd_arr[ti][0] == i || j == 0) && 
                     (!instr_arr[ti][1] || fwd_arr[ti][1] == i || j <= 1) && 
                     (!instr_arr[ti][2] || fwd_arr[ti][2] == i || j <= 2) && 
                     (!instr_arr[ti][3] || fwd_arr[ti][3] == i || j <= 3))
                  {
                     if (rarr[ndx] < 0.6)
                     {
                        fwd_arr[ti][j] = i;
                     }
                     ndx++;
                  }
               }
            }
         }
      }
      return fwd_arr;
   }
   
   this.adaptPattern = function(stress, energy)
   {
      if (!self.has_gen)
      {
         console.log("No generation call performed!");
         return;
      }
   
      self.pattern = new Array();
      self.random = new rng(self.aud_seed);
      
      var base_note = Math.floor(self.random.next() * 11.99) + 12;
      var transitions = new Array();
      self.interf.speed = 0.9 + self.random.next() * 0.9;
            
      for (var i = 0; i < self.aud_pat; i++)
      {
         if (self.random.next() < 0.5)
            transitions.push("low");
         else
            transitions.push("high");
      }
      
      self.random = new rng(self.aud_seed);
      var instr_arr = new Array();
      populate_instr(energy, self.aud_pat, instr_arr);
      
      self.random = new rng(self.aud_seed);
      var fwd_arr = populate_fwd(instr_arr, self.aud_pat);
      
      // reset RNG for pattern-length independence
      self.random = new rng(self.aud_seed);
      self.populate_perc(stress, energy, self.aud_pat, self.aud_patlen, transitions);
      
      // Pick base note and create base note
      var Jmap = self.createTriJMap(stress, energy);
      var Pmap = self.createTriPMap(stress, energy);
      
      var n_eng = 0.5;
      var n_ran = 1.2;
      
      // reset RNG for pattern-length independence
      self.random = new rng(self.aud_seed);
      var n_tracks = Math.floor(2 + energy * n_eng + self.random.next() * n_ran);
      // set other instruments & melody
      self.populate_melody(stress, energy, self.aud_pat, self.aud_patlen, transitions, Jmap, Pmap, base_note, 0, instr_arr, n_tracks, fwd_arr);
      
      self.random = new rng(self.aud_seed);
      for (var temp = 0; temp < 20; temp++) self.random.next(); // so the two melodic tracks aren't identical
      n_tracks = Math.floor(2 + energy * n_eng + self.random.next() * n_ran);
      self.populate_melody(stress, energy, self.aud_pat, self.aud_patlen, transitions, Jmap, Pmap, base_note + 7, 1, instr_arr, n_tracks, fwd_arr);
      
      self.random = new rng(self.aud_seed);
      for (var temp = 0; temp < 40; temp++) self.random.next(); // so the two melodic tracks aren't identical
      n_tracks = Math.floor(2 + energy * n_eng + self.random.next() * n_ran);
      self.populate_melody(stress, energy, self.aud_pat, self.aud_patlen, transitions, Jmap, Pmap, base_note + 12, 2, instr_arr, n_tracks, fwd_arr);
      
      self.random = new rng(self.aud_seed);
      for (var temp = 0; temp < 80; temp++) self.random.next(); // so the two melodic tracks aren't identical
      n_tracks = Math.floor(2 + energy * n_eng + self.random.next() * n_ran);
      self.populate_melody(stress, energy, self.aud_pat, self.aud_patlen, transitions, Jmap, Pmap, base_note + 24, 3, instr_arr, n_tracks, fwd_arr);
      
      // copy the pattern into the player interface
      if (self.interf.pattern == 0)
         self.interf.pattern = self.pattern;
      else
      {
         self.interf.to_pattern = self.pattern;
         self.interf.to_time = 40000;
         self.interf.to_total = 40000;
      }
   }
   
   this.generatePattern = function(stress, energy, pat, patlen, seed)
   {
      if (pat < 1) pat = 1;
      if (pat > 100) pat = 100;
      if (patlen < 1) patlen = 1;
      if (patlen > 8) patlen = 8;
   
      // apply new pattern/length/seed
      self.aud_pat = pat;
      self.aud_patlen = patlen;
      self.aud_seed = seed;
      
      self.has_gen = true;
      self.adaptPattern(stress, energy);  

      // reset song
      self.interf.t = 0;
      self.interf.prev_pos = 0;
      self.pattern_position = 0;
      self.interf.paused = true;
      if (self.ontick != 0) self.ontick();
      
   }
}

aud.clear();