var screenWidth = 640;
var screenHeight = 700;

//Should this be a box and sprite classes (i.e. separated from each other?)
var Box = function(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    /* return a coordinate pair of the box's center */
    this.centerX = function() { return ((this.width/2.0) + this.x); };
    this.centerY = function() { return ((this.height/2.0) + this.y); };

    //hit box definitions
    this.left = function() { return this.x; };
    this.right = function() { return this.x + this.width; };
    this.top = function() { return this.y; };
    this.bottom = function() { return this.y + this.height; };

    this.hasCollided = function(otherBox) {
        var collisionDetected = true;
        if (otherBox.bottom() <= this.top() ||
            otherBox.top() >= this.bottom() ||
            otherBox.left() >= this.right() ||
            otherBox.right() <= this.left()) {
            collisionDetected = false;
        }
        return collisionDetected;
    };
};

var SpriteGroup = function(roster) {
    this.spriteRoster = roster;
    this.dispatch = function(spriteFunction, argList) {
        return _.map(this.spriteRoster, function(sprite) {
            return sprite[spriteFunction].apply(sprite, argList);
        });
    };
    /* If we try to remove sprites one at a time via something like array.prototype.slice we may run into the issue of removing the wrong sprite objects as the list gets reindexed */
    this.removeFromRoster = function(indicies) {
        var score = 0;
        _.each(indicies, function(index) {
            score += this.spriteRoster[index].score;
            delete this.spriteRoster[index];
        }.bind(this));
        this.spriteRoster = _.reject(this.spriteRoster, function(sprite) { return typeof sprite === "undefined"; });
        return score;
    };
    /* Test the collision of a single sprite against a group of sprites. Returns a list of indicies corresponding to the sprite in the roster that tested positive for collision */
    this.hasCollidedGroup = function(otherSprite) {
        var collisionTests = this.dispatch("detectCollision", [otherSprite]);
        var hitSprites = [];
        var score = 0;
        _.each(collisionTests, function(wasHit, index) {
            if (wasHit) {
                hitSprites.unshift(index);
            }
        }.bind(this));
        return hitSprites;
    };
};

var BackgroundSprite = function() {
    this.image = new Image();
    this.image.src = "assets/bg.bmp";
    this.drawRoutine = function(context) {
        context.drawImage(this.image, 0, 0);
    };
};

/* The wall works very similar to the invaders, except they dont move and can be hit by both sides */
var Wall = function(x, y, hitpoints) {
    this.box = new Box(x,y,10,10);

    /* Given these have a durability we dont have report when it is hit
     * but rather when the wall is destroyed completely */
    this.detectCollision = function(otherEntity) {
        var returnValue = false;
        if (this.box.hasCollided(otherEntity.box)) {
            otherEntity.reload();
            returnValue = true;
        };
        return returnValue;
    };

    this.updateRoutine = function() {};
    
    this.drawRoutine = function(context) {
        context.fillStyle = "#aaa";
        context.fillRect(this.box.x, this.box.y, this.box.width, this.box.height);
    };
};

var WallGroup = function() {
    /* The following calculates a set of offsets to be added to a base coordinate to get the overall "wall" as a shape
     * essentially this allows the all to act as one large sprite. Note: Starting X,Y coordinates represent the top right
     * of the formation
     */
    this.createFormationOffset = function(startingX, startingY) {
        // for loops would be useful if our shape wasnt so weird. Also we increment horizontally by 10 because our wall size is 10.
        /*   xxx     This is how the wall is supposed to look like
         *  xxxxx
         * xxxxxxx
         * xxxxxxx
         * xx   xx
         */
        return [{x: (startingX+20), y: startingY}, {x: (startingX+30), y: startingY}, {x: (startingX+40), y: startingY},
                {x: (startingX+10), y: (startingY+10)}, {x: (startingX+20), y: (startingY+10)}, {x: (startingX+30), y: (startingY+10)}, {x: (startingX+40), y: (startingY+10)}, {x: (startingX+50), y: (startingY+10)},
                {x: startingX, y: (startingY+20)}, {x: (startingX+10), y: (startingY+20)}, {x: (startingX+20), y: (startingY+20)}, {x: (startingX+30), y: (startingY+20)}, {x: (startingX+40), y: (startingY+20)}, {x: (startingX+50), y: (startingY+20)}, {x: (startingX+60), y: (startingY+20)},
                {x: startingX, y: (startingY+30)}, {x: (startingX+10), y: (startingY+30)}, {x: (startingX+20), y: (startingY+30)}, {x: (startingX+30), y: (startingY+30)}, {x: (startingX+40), y: (startingY+30)}, {x: (startingX+50), y: (startingY+30)}, {x: (startingX+60), y: (startingY+30)},
                {x: startingX, y: (startingY+40)}, {x: (startingX+10), y: (startingY+40)}, {x: (startingX+50), y: (startingY+40)}, {x: (startingX+60), y: (startingY+40)}];
    };
    this.bringUpWalls = function() {
        var wallCoordinates = _.flatten([this.createFormationOffset(50, 570), this.createFormationOffset(200, 570), this.createFormationOffset(350, 570), this.createFormationOffset(500, 570)]);
        var walls = _.map(wallCoordinates, function(coordinatePair) {
            return new Wall(coordinatePair.x, coordinatePair.y, 1);
        });
        SpriteGroup.call(this, walls);
    };
    this.bringUpWalls();
    //SpriteGroup.call(this, [(new Wall(320, 590, 4)), (new Wall(365, 590, 4))]);

    /* Given we do not destroy walls immediately it's possible that an index
     * may appear multiple times as it's hp drops further below zero. 
     */
    this.detectCollision = function(otherEntities) {
        var destroyedWalls = _.map(otherEntities, function(bullet) {
            return this.hasCollidedGroup(bullet);
        }.bind(this));
        this.removeFromRoster(_.unique(_.flatten(destroyedWalls)));
    };

    this.drawRoutine = function(context) {
        this.dispatch("drawRoutine", [context]);
    };        
};

WallGroup.prototype = SpriteGroup.prototype;

var Invader = function(x, y, spriteSet, score, id) {
    this.id = id;
    this.box = new Box(x,y,30,30);
    /* TODO replace these with array of sprites instead */
    this.currentSprite = 0;
    this.spriteSet = spriteSet;

    this.score = score;
    this.speed = 7;
    this.direction = 1;

    //Another internal timer to determine when to shoot
    this.bullet = new Bullet(10, "invader");
    //Expose the bullet's reload API to sprite Group
    this.reload = function() { this.bullet.reload(); };
 
    this.shoot = (function(shotFrequency) {
        var frequency = shotFrequency;
        var counter = shotFrequency;
        var bullet = this.bullet;
        var shotSound = new SoundBite("audio/shot.ogg");
        return function(x, y, newFrequency) {
            if (typeof newFrequency !== "undefined" && newFrequency > 0) {
                frequency = newFrequency;
                counter = frequency;
            };
            var timeUp = false;
            counter -= 1;
            if (counter === 0) {
                shotSound.play();
                bullet.shoot(x,y);
                counter = frequency;
            }
        };
    }).bind(this)(8);

    // Maybe we should add bouding box attributes
    this.screenBoundaryCheck = function() {
        var proposedMovement = this.box.x + (this.direction * this.speed);
        var result = false;
        if ((proposedMovement + this.box.width) >= screenWidth || proposedMovement <= 0) {
            result = true;
        }
        return result;
    };

    this.detectCollision = function (otherEntity) {
        return this.box.hasCollided(otherEntity.box);
    };

    this.updateRoutine = function(moveUp, whoShoots) {
        this.currentSprite = (this.currentSprite+1 > this.spriteSet.length-1) ? 0 : this.currentSprite+1;
        if(moveUp) {
            this.box.y += this.box.height;
            this.direction *= -1;
        } else {
            this.box.x += (this.speed * this.direction);
        }
        if (_.contains(whoShoots, this.id)) {
            this.shoot(this.box.x, this.box.y);
        };
    };

    this.drawRoutine = function(context) {
        this.bullet.drawRoutine(context);
        context.drawImage(this.spriteSet[this.currentSprite], this.box.x, this.box.y);
    };
};

var Ufo = function() {
    this.box = new Box(-99, 40, 30, 30);
    this.isVisible = false;
    this.reset = function() {
        this.isVisible = false;
        this.box.x = -99;
    };
    this.sprite = new Image();
    this.sprite.src = "assets/ufo.png";
    
    this.sound = new SoundBite("audio/ufo.ogg");
    
    this.setUp = function() {
        this.isVisible = true;
        this.box.x = screenWidth;
    };

    this.detectCollision = function(otherEntity) {
        var didHit = false;
        if(this.box.hasCollided(otherEntity.box)) {
            otherEntity.reload();
            this.reset();
            didHit = true;
        };
        return didHit;
    };

    this.drawRoutine = function(context) {
        if (this.isVisible) {
            if (this.box.right() > 0) {
                this.box.x -= 10;
            } else {
                this.reset();
            }
            context.drawImage(this.sprite, this.box.x, this.box.y);            
        };        
    };
};

var InvaderClock = function() {
    this.frequency = 1000;
    this.lastMovementTime;
    this.getCurrentTime = function() { return (new Date).getTime(); };
    this.resetFrequency = function() {
        this.frequency = 1000;
    };
    this.decreaseTime = function(remaining) {
        if (remaining > 5) {
            this.frequency -= (this.frequency * .04);
        } else {
            this.frequency -= (this.frequency * .4);
        }
    };
    this.tick = function() {
        var result = false;
        if (typeof this.lastMovementTime === "undefined") {
            this.lastMovementTime = this.getCurrentTime();
        } else if ((this.lastMovementTime + this.frequency) <= this.getCurrentTime()) {
            result = true;
            this.lastMovementTime = this.getCurrentTime();
        }
        return result;
    };
};

var InvaderGroup = function() {
    this.movementSounds = [new SoundBite("audio/invmv0.ogg"),
                           new SoundBite("audio/invmv1.ogg"),
                           new SoundBite("audio/invmv2.ogg"),
                           new SoundBite("audio/invmv3.ogg")];

    this.soundIndex = 0;
    
    var generateSpriteSet = function(spritePrefix) {
        return _.map(_.range(0,2), function(i) {
            var image = new Image;
            image.src = "assets/"+spritePrefix+i+".png";
            return image;
        });
    };

    this.octopusSpriteSet = generateSpriteSet("oct");
    this.crabSpriteSet = generateSpriteSet("crab");
    this.squidSpriteSet = generateSpriteSet("squid");
    
    this.startingX = 50;
    this.startingY = 80;
    this.shotSpeed = 10;
    
    this.reinitializeSpriteGroup = function(level) {
        if (level > 1) {
            this.startingY += (20 * level);
        }
        var invaders = [];
        var x = this.startingX;
        var y = this.startingY;
        for (var i = 1; i <= 55; i++) {
            x += 35;
            if (i < 12) {
                invaders.push(new Invader(x, y, this.squidSpriteSet, 40, i));
            } else if (i < 34) {
                invaders.push(new Invader(x, y, this.crabSpriteSet, 20, i));
            } else {
                invaders.push(new Invader(x, y, this.octopusSpriteSet, 10, i));
            }
            if (i%11 === 0) {
                x = this.startingX;
                y += 35;
            }
        }
        SpriteGroup.call(this,invaders);        
    };

    /* invaders move every second rather than a continuous flow like
     * the player */
    this.invaderClock = new InvaderClock();

    this.bullets = function() { return _.map(this.spriteRoster, function(invader) { return invader.bullet; }); };

    this.detectCollision = function(otherEntity) {
        var hits = this.hasCollidedGroup(otherEntity);
        var score = 0;
        //When it comes time to score simply reference them before deleting
        if (hits.length > 0) {
            score = this.removeFromRoster(hits);
            this.invaderClock.decreaseTime(this.spriteRoster.length);
            otherEntity.reload();
        }
        return {score: score, left: this.spriteRoster.length};
    };

    this.reload = function() {
        this.dispatch("reload");
    };
    
    this.drawRoutine = function(context) {
        var shooterGroup = _.map(_.range(5), function(i) {
            return parseInt(Math.random() * 54);
        });
        if (this.invaderClock.tick()) {
            this.movementSounds[this.soundIndex].play();
            this.soundIndex = (this.soundIndex+1 > this.movementSounds.length-1) ? 0 : this.soundIndex+1;
            // map/reduce on our collective screenBoundaryCheck call
            var hitBoundary = _.reduce(this.dispatch("screenBoundaryCheck"), function(check, result) {
                return check || result;
            });
            this.dispatch("updateRoutine", [hitBoundary, shooterGroup]);
        }
        this.dispatch("drawRoutine", [context]);
    };

    this.breach = function(breachPoint) {
        //We just use each, instead of dispatch then looping through again to check for a true result;
        var breach = _.find(this.spriteRoster, function(sprite) {
            return (sprite.box.top() > breachPoint);
        });
        return breach;
    };
};

InvaderGroup.prototype = SpriteGroup.prototype;

var Bullet = function(speed, owner) {
    this.box = new Box(999, 999, 5, 10);
    this.speed = speed;
    this.owner = owner;

    this.isShot = false;
    this.shoot = function(x, y) {
        if(!this.isShot) {
            this.box.x = x;
            this.box.y = y;
            this.isShot = true;
        }  
    };
    this.reload = function() {
        this.isShot = false;
        this.box.y = 999;
    };

    this.drawRoutine = function(context) {
        /* This is needed for boundary testing */
        context.fillStyle = "rgb(255, 255, 255)";
        context.fillRect(this.box.x, this.box.y, this.box.width, this.box.height);
        if (this.isShot) {
            this.box.y += this.speed;
            if ((this.speed < 0 && this.box.top() <= 0) || (this.speed > 0 && this.box.bottom() >= screenHeight)) {
                this.reload();
            }
        }
    };
};

var Player = function() {
    this.regularImage = new Image();
    this.regularImage.src  = "assets/ship.png";
    this.deathImage = new Image();
    this.deathImage.src = "assets/pexp.png";

    this.displayDeath = function(dead) {
        this.currentImage = (dead) ? this.deathImage : this.regularImage;
    };

    this.displayDeath(false);

    this.shotSound = new SoundBite("audio/shot.ogg");
    this.box = new Box(320, 650, 30, 30);
    this.speed = 7;

    this.lives = 3;

    this.bullet = new Bullet(-10, "player");

    // The UFO has a 15% chance of appearing every 400 shots
    this.shotCounter = 0;

    /* Called by our canvas */
    this.drawRoutine = function(context) {
        this.bullet.drawRoutine(context);
        context.drawImage(this.currentImage, this.box.x, this.box.y);
    };

    this.detectCollision = function(bullets) {
        var bulletBoxes = _.map(bullets, function(bullet) { return this.box.hasCollided(bullet.box); }.bind(this));
        return _.reduce(bulletBoxes, function(hasHit, result) { return hasHit || result; });
    };

    /* Called by the document */
    this.handleKeyDownEvents = function(event) {
        switch(event.keyCode) {
        case 37:
            this.box.x -= this.speed;
            if (this.box.left() < this.speed) {
                this.box.x = this.speed;
            }
            break;
        case 39:
            this.box.x += this.speed;
            if (this.box.right() > (screenWidth - this.speed)) {
                this.box.x = (screenWidth - this.box.width - this.speed);
            }
            break;
        case 32:
            if (!this.bullet.isShot) {
                this.shotSound.play();
            }
            this.bullet.shoot(this.box.centerX(), this.box.centerY());
            break;
        };
    };

};

var Display = function() {
    /* Either buffer may be active at any time so no real reason
     * to distinguish between the two, however we set the first one
     * to be active initially
     */
    // Active buffer can also be computed (which is currently not display none
    this.bufferOne = this.activeBuffer = {canvas: document.getElementById("canvas1"),
                                          context: document.getElementById("canvas1").getContext("2d")};
    this.bufferTwo = {canvas: document.getElementById("canvas2"),
                      context: document.getElementById("canvas2").getContext("2d")};
    this.backBuffer = function() {
        return ((this.activeBuffer === this.bufferOne) ? this.bufferTwo : this.bufferOne);
    };

    this.swapBuffers = function() {
        this.activeBuffer.canvas.style.display = 'none';
        this.activeBuffer = this.backBuffer();
        this.activeBuffer.canvas.style.display = 'block';
    };

    this.displayWidth = 640;
    this.displayHeight = 700;
    this.clearColor = "rgb(255,255,255)";
    this.clearBuffer = function(context) {
        context.fillStyle = this.clearColor;
        context.fillRect(0, 0, this.displayWidth, this.displayHeight);
    };

    /* Just for reference we draw to the back buffer */
    this.drawToBuffer = function(gameEntities) {
        this.clearBuffer(this.backBuffer().context);
        _.map(gameEntities, function(gameEntity) {
            gameEntity.drawRoutine((this.backBuffer()).context);
        }.bind(this));
    };

    /* Used for a simply screen with text. More efficient than needing a sprite for this.
     * Provides primitive multi-line support
     */
    this.drawTextOnly = function(text) {
        this.clearBuffer(this.backBuffer().context);
        this.backBuffer().context.fillStyle = "#000";
        this.backBuffer().context.fillRect(0, 0, this.displayWidth, this.displayHeight);
        this.backBuffer().context.font = '25pt Audiowide';
        this.backBuffer().context.textAlign = 'center';
        this.backBuffer().context.fillStyle= '#fff';
        if (_.isArray(text)) {
            var ypos = this.displayHeight/2.;
            _.each(text, function(line) {
                this.backBuffer().context.fillText(line, this.displayWidth/2., ypos);
                ypos += 40;
            }.bind(this));
        } else {
            this.backBuffer().context.fillText(text, this.displayWidth/2., this.displayHeight/2.);
        }
    };
};

var display = new Display();

var TextSprite = function(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.text = "";
    this.drawRoutine = function(context) {
        context.font = '25pt Audiowide';
        context.textAlign = 'center';
        context.fillStyle= this.color;
        context.fillText(this.text, this.x, this.y);
    };
};

var TitleScreen = function() {
    var titleScreenImage = new Image();
    titleScreenImage.src = "assets/introscreen.png";
    this.drawRoutine = function (context) {
        context.drawImage(titleScreenImage, 0, 0);
    };
};

var SoundBite = function(soundUrl) {
    this.source = soundUrl;
    this.audio = new Audio(soundUrl);
    this.play = function() { this.audio.play(); };
};

function game() {
    var gameState = 1;

    var titleScreen = new TitleScreen();

    var level = 1;

    var backgroundSprite = new BackgroundSprite();
    var player;
    var invaderGroup;
    var wallGroup;
    var gameEntities;
    var scoreBoard = new TextSprite(100, 30, "#fff");
    var score = 0;
    var livesCounter = new TextSprite(screenWidth-100, 30, "#fff");
    
    //The UFO is a special invader, one that we can simply keep reusing
    var ufo = new Ufo();
    var shotCounter = 0;

    /* Sound */
    var explosionSound = new SoundBite("audio/playerexp.ogg");

    var initiateGame = function(level) {
        gameState = 2;
        
        player = new Player();
        livesCounter.text = "Lives: " + player.lives;
        invaderGroup = new InvaderGroup();
        invaderGroup.reinitializeSpriteGroup(level);
        wallGroup = new WallGroup();

        gameEntities = [backgroundSprite, scoreBoard, livesCounter, invaderGroup, wallGroup, player, ufo];
        display.drawToBuffer(gameEntities);
        display.swapBuffers();
    };

    var resetStats = function() {
        level = 1;
        score = 0;
    };

    /* This is probably the bigger difference between regular game
     * programming. Usually events are handled within the game loop
     * rather than an outside entity. In javascript we do not have a
     * choice as events are handled asynchronously
     */
    window.addEventListener("keydown", function(event) {
        switch(gameState) {
        case 1:
        case 3:
        case 5:
            if(event.keyCode === 13) {
                initiateGame(level);
            }
            break;
        case 2:
            player.handleKeyDownEvents(event);
            break;
        }
    });

    function gameLoop() {
        if (gameState === 1) {
            display.drawTextOnly(["Space Invaders", "Press Enter to start"]);
            display.swapBuffers();
        } else if (gameState === 2) {
            if (invaderGroup.breach(470)) {
                resetStats();
                gameState = 5;
            }
            else {
                wallGroup.detectCollision(_.flatten([player.bullet,invaderGroup.bullets()]));
                var results = invaderGroup.detectCollision(player.bullet);
                score += results.score;
                if (ufo.detectCollision(player.bullet)) {
                    score += 100;
                }
                scoreBoard.text = "Score: " + score;
                if (results.left === 0) {
                    level+=1;
                    gameState = 3;
                } else {
                    if (player.detectCollision(invaderGroup.bullets())) {
                        player.lives -= 1;
                        livesCounter.text = "Lives: " + player.lives;
                        if (player.lives > 0) {
                            player.displayDeath(true);
                            player.bullet.reload();
                            explosionSound.play();
                            invaderGroup.reload();
                            gameState = 4;
                            window.setTimeout(function() {
                                player.displayDeath(false);
                                gameState = 2;
                            }, 3500);
                        } else {
                            resetStats();
                            gameState = 5;
                        };
                    }
                }
            }
            display.drawToBuffer(gameEntities);
            display.swapBuffers();
        } else if (gameState === 3) {
            display.drawTextOnly([("Level " + level), "Press Enter to continue"]);
            display.swapBuffers();
        } else if (gameState === 5) {
            score = 0;
            display.drawTextOnly(["GAME OVER", "Press Enter to try again"]);
            display.swapBuffers();
        }
        window.requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
}

game();
