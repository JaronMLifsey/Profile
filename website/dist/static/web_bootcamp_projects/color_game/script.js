// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined' ? args[number] : match;
    });
  };
}

// Returns a random integer in the range [min, max)
function randomInt(min, max) {
  return Math.min(Math.floor(Math.random() * (max - min) + min), max - 1);
}

// Color class ------------------------
var Color = function(red, green, blue){
  this.red = red;
  this.green = green;
  this.blue = blue;
}
Color.prototype.red = 0;
Color.prototype.green = 0;
Color.prototype.blue = 0;
Color.prototype.isEqual = function (other){
  return this.red === other.red && this.green === other.green && this.blue === other.blue;
}
Color.prototype.toString = function(){
  return "RGB({0}, {1}, {2})".format(this.red, this.green, this.blue);
}
Color.prototype.toStringAlpha = function(alpha){
  return "RGB({0}, {1}, {2}, {3})".format(this.red, this.green, this.blue, alpha);
}

// RandomColor Class --------------------
var RandomColor = function(){
  this.red = randomInt(0, 256);
  this.green = randomInt(0, 256);
  this.blue = randomInt(0, 256);
}
RandomColor.prototype = Object.create(Color.prototype);

// Panel Class ----------------------------
var Panel = function(element, num){
  this.element = element;
  this.enabled = true;
  this.animationTime = 0;
  element.addEventListener("click", (function(){
    if (this.enabled && gameRunning){
      guessMade(this);
    }
  }).bind(this));
}
Panel.prototype.disable = function(){
  if (this.enabled){
    this.enabled = false;
    this.fadeOut();
  }
}
Panel.prototype.enable = function(){
  if (!this.enabled){
    this.enabled = true;
    this.fadeIn();
  }
}
Panel.prototype.randomize = function(){
  this.setColor(new RandomColor());
}
Panel.prototype.setColor = function(color){
  this.color = color;
  this.element.style.backgroundColor = this.color.toString();
}
Panel.prototype.setOpacity = function(opacity){
  this.element.style.backgroundColor = this.color.toStringAlpha(opacity);
}
Panel.prototype.fadeOut = function(){
  this.setOpacity(0);
  this.element.classList.add("hidden");
}
Panel.prototype.fadeIn = function(){
  this.setOpacity(1);
  this.element.classList.remove("hidden");
}

// Variables ----------------------------
const EDifficulty = {
  EASY: 1,
  HARD: 2,
};

var elements = {
  targetColorText: document.getElementById("target_color_text"),
  tryAgain: document.getElementById("try_again"),
  newColorsBtn: document.getElementById("new_colors_btn"),
  easyBtn: document.getElementById("easy_btn"),
  hardBtn: document.getElementById("hard_btn"),
  titleBanner: document.getElementById("title_banner"),
  guessPanels: document.getElementsByClassName("guess-panel"),
};

var guessPanels = new Array();//The panels for easy difficulty only
var hardPanels = new Array();//The extra panels for hard difficulty only
var easyPanels = new Array();
var correctPanel = null;
var difficulty = EDifficulty.HARD;
var gameRunning = true;

// Functions ----------------------------
function resetGame(){
  (difficulty === EDifficulty.EASY ? easyPanels : guessPanels).forEach(function(panel){
    panel.randomize();
    panel.enable();
  });
  if (difficulty === EDifficulty.EASY){
    hardPanels.forEach(function(panel){
      panel.disable();
    });
  }

  correctPanel = guessPanels[randomInt(0, difficulty === EDifficulty.EASY ? 3 : 6)];

  elements.targetColorText.textContent = correctPanel.color.toString();
  elements.titleBanner.removeAttribute("style");
  elements.tryAgain.textContent = "";

  gameRunning = true;
}

function guessMade(pickedPanel){
  if (correctPanel === pickedPanel){
    gameRunning = false;
    elements.tryAgain.textContent = "Correct!";
    (difficulty == EDifficulty.EASY ? easyPanels : guessPanels).forEach(function(panel){
      if (panel !== correctPanel){
        panel.setColor(correctPanel.color);
        panel.enable();
      }
    });
    elements.titleBanner.style.backgroundColor = correctPanel.color.toString();
  }
  else{
    elements.tryAgain.textContent = "Try Again";
    pickedPanel.disable();
  }
}

function onLoad(){
  for (var i = 0; i < elements.guessPanels.length; i ++){
    guessPanels.push(new Panel(elements.guessPanels[i], i));
  }
  easyPanels = guessPanels.slice(0, 3);
  hardPanels = guessPanels.slice(3, 6);

  elements.newColorsBtn.addEventListener("click", function(){
    resetGame();
  });
  elements.easyBtn.addEventListener("click", function(){
    if (difficulty != EDifficulty.EASY){
      difficulty = EDifficulty.EASY;
      elements.easyBtn.classList.add("selected");
      elements.hardBtn.classList.remove("selected");
      resetGame();
    }
  });
  elements.hardBtn.addEventListener("click", function(){
    if (difficulty != EDifficulty.HARD){
      difficulty = EDifficulty.HARD;
      elements.hardBtn.classList.add("selected");
      elements.easyBtn.classList.remove("selected");
      resetGame();
    }
  });

  resetGame();
}
onLoad();