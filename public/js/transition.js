function JungleTransition(game) {
   this.timeLeft = this.totalTime = 3000;
   this.done = false;
   this.canv = game.ext_canvas;

   // Grab RGB
   var rgbStr = game.ext_canvas.style.background.split(/\(|,/);
   this.beginColor = {
      r: parseInt(rgbStr[1], 10),
      g: parseInt(rgbStr[2], 10),
      b: parseInt(rgbStr[3], 10)      
   };
   this.endColor = { r: 0, g: 102, b: 0 };
   this.dColor = {
      r: this.endColor.r - this.beginColor.r,
      g: this.endColor.g - this.beginColor.g,
      b: this.endColor.b - this.beginColor.b
   };
}

JungleTransition.prototype.update = function(dt) {
   this.timeLeft -= dt;

   var percent = this.timeLeft / this.totalTime;
   var r = Math.round(this.endColor.r - this.dColor.r * percent),
       g = Math.round(this.endColor.g - this.dColor.g * percent),
       b = Math.round(this.endColor.b - this.dColor.b * percent);

   this.canv.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';

   if (this.timeLeft <= 0)
      this.done = true;
};

JungleTransition.prototype.drawOnBoard = function(context) {};
JungleTransition.prototype.drawOnBackground = function(context) {};
JungleTransition.prototype.drawOnHUD = function(context) {
   var text = Math.ceil(this.timeLeft / 1000).toString();

   context.font = '40px Arial';
   context.fillStyle = 'white';

   var size = context.measureText(text);
   size.height = 40;

   context.font = '40px Arial';
   context.fillStyle = 'white';
   context.fillText(text, (GAME_WIDTH - size.width) / 2, (GAME_HEIGHT - size.height) / 2)
};

function DubTransition(game) {
   this.timeLeft = this.totalTime = 3000;
   this.done = false;
   this.canv = game.ext_canvas;

   // Grab RGB
   var rgbStr = game.ext_canvas.style.background.split(/\(|,/);
   this.beginColor = {
      r: parseInt(rgbStr[1], 10),
      g: parseInt(rgbStr[2], 10),
      b: parseInt(rgbStr[3], 10)      
   };
   this.endColor = { r: 0, g: 0, b: 0 };
   this.dColor = {
      r: this.endColor.r - this.beginColor.r,
      g: this.endColor.g - this.beginColor.g,
      b: this.endColor.b - this.beginColor.b
   };
}

DubTransition.prototype = JungleTransition.prototype;