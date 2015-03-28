function Transition(game) {
   this.timeLeft = 2000;
   this.done = false;
}

Transition.prototype.update = function(dt) {
   this.timeLeft -= dt;

   if (this.timeLeft <= 0)
      this.done = true;
};

Transition.prototype.drawOnBoard = function(context) {};
Transition.prototype.drawOnBackground = function(context) {};
Transition.prototype.drawOnHUD = function(context) {
   var text = Math.ceil(this.timeLeft / 1000).toString();

   context.font = '40px Arial';
   context.fillStyle = 'white';

   var size = context.measureText(text);
   size.height = 40;

   context.font = '40px Arial';
   context.fillStyle = 'white';
   context.fillText(text, (GAME_WIDTH - size.width) / 2, (GAME_HEIGHT - size.height) / 2)
};