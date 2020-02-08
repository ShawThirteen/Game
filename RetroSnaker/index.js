var Util = {
	$: function (id, context) {
		if (context) {
			return context.ownerDocument.getElementById(id);
		} else {
			return document.getElementById(id);
		}
	},
	removeClass: function (element, className) {
		var nowNameArr = element.className.split(' ');
		var curIndex = nowNameArr.indexOf(className);
		if (curIndex > -1) {
			nowNameArr.splice(curIndex, 1);
			element.className = nowNameArr.join(' ');
		}
	},
	addClass: function (element, className) {
		var nowNameArr = element.className.split(' ');
		var curIndex = nowNameArr.indexOf(className);
		if (curIndex == -1) {
			nowNameArr.push(className);
			element.className = nowNameArr.join(' ');
		}
	}
}

function Engine () {
	this.ruleHeap = {};
}

Engine.prototype.setRule = function (ruleName, fn) {
	this.ruleHeap[ruleName] = fn;
}

Engine.prototype.getRule = function (ruleName) {
	return this.ruleHeap[ruleName];
}

Engine.prototype.runRule = function () {
	var ruleName = arguments[0];
	var args = Array.prototype.slice.call(arguments, 1);
	return this.ruleHeap[ruleName].apply(null, args);
}

function Game (container, element) {
	this.handle = {};
	this.element = element;
	this.container = container;
	this.direc = 'right';
	this.isPause = true; // 初始状态时暂停的
	this.keyCodeData = {
		38: 'up',
		40: 'down',
		37: 'left',
		39: 'right'
	};
	this.bodyData = { // 用户初始化的躯体地址
		user1Arr: [
			[10, 0],
			[10, 1],
			[10, 2]
		]
	}
	this.draw(); // 渲染操作主体
	this.randBlock(); // 随机渲染碰撞块
	this.bind(); // 绑定事件
}

Game.prototype.run = function () {
	var user1Arr = this.bodyData.user1Arr;
	var curLen = user1Arr.length;
	var curHeader = user1Arr[curLen - 1];
	var newHeader = curHeader.slice();
	switch (this.direc) {
		case 'up':
			newHeader[0] -= 1;
			break;
		case 'down':
			newHeader[0] += 1;
			break;
		case 'left':
			newHeader[1] -= 1;
			break;
		case 'right':
			newHeader[1] += 1;
			break;
	}
	
	// 判断是否碰撞
	if (this._isOverFlow(newHeader)) {
		this.pause();
		alert('主体毁灭');
		return;
	}

	this.clearDraw(); // 清除原来的样子
	user1Arr.push(newHeader); // 将新元素填充
	// 判断是否需要吃
	if (this.addressCompare(newHeader, this.blockAddress)) {
		// 清除绘制
		this._clearDrawItem(this.blockAddress, 'block');
		this.randBlock(); // 重新生成下一个块
	} else {
		user1Arr.shift(); // 删掉首位
	}
	this.draw();
}


Game.prototype._clearDrawItem = function (tdAddress, className) {
	var curtd = this.element[tdAddress[0]][tdAddress[1]];
	Util.removeClass(curtd, className);
}
Game.prototype.clearDraw = function () {
	var user1Arr = this.bodyData.user1Arr;
	var headerData = user1Arr[user1Arr.length - 1];

	this._clearDrawItem(user1Arr[0], 'active');
	this._clearDrawItem(headerData, 'active');
	this._clearDrawItem(headerData, 'header');
}
/*
* 用来渲染td元素的样式
* @params tdAdd [Array[Array]] 二维数组用来存放td地址
*/
Game.prototype.draw = function (tdAdd) {
	var user1Arr = tdAdd || this.bodyData.user1Arr;
	for (var i = 0, len = user1Arr.length; i < len; i++) {
		var curLoc = user1Arr[i];

		this._drawItem(curLoc, 'active');
		if (i == len - 1) {
			this._drawItem(curLoc, 'header');
		}
	}
}
Game.prototype._drawItem = function (address, className) {
	var curTd = this.element[address[0]][address[1]];
	Util.addClass(curTd, className);
}

Game.prototype.addressCompare = function (a, b) {
	if (a[0] == b[0] && a[1] == b[1]) {
		return true;
	}
	return false;
}

/*
* 判断是否进行碰撞
* @params tdAddress [Array] 传入的td地址
*/
Game.prototype._isOverFlow = function (tdAddress) {
	if (tdAddress[0] < 0 || tdAddress[1] < 0) {
		return true; // 碰撞边界
	}
	if (tdAddress[0] >= this.element.length || tdAddress[1] >= this.element[0].length) {
		return true; // 碰撞边界
	}
	for (var i = 0, len = this.bodyData.user1Arr.length; i < len; i++) {
		var curItem = this.bodyData.user1Arr[i];
		// 碰撞自身
		if (this.addressCompare(curItem, tdAddress)) {
			return true;
		}
	}
	return false;
}

Game.prototype.loop = function () {
	var _this = this;
	_this.gameTimer = setInterval(function () {
		_this.run();
	}, 500)
}

Game.prototype.pause = function () {
	this.stopLoop();
	this.isPause = true;
}

Game.prototype.resume = function () {
	this.loop();
	this.isPause = false;
}

Game.prototype.randBlock = function () {
	var row = this.element.length;
	var col = this.element[0].length;
	var blockAddress = [Math.floor(Math.random() * row), Math.floor(Math.random() * col)];

	// 检测碰撞
	if (this._isOverFlow(blockAddress)) {
		this.randBlock();
	} else {
		this.blockAddress = blockAddress;
		this._drawItem(blockAddress, 'block');
	}
}

Game.prototype.stopLoop = function () {
	clearInterval(this.gameTimer);
}

Game.prototype.setDirec = function (direc) {
	this.direc = direc;
}

Game.prototype.changeState = function () {
	if (this.isPause) {
		this.resume();
	} else {
		this.pause();
	}
}

Game.prototype.bind = function () {
	var _this = this;
	_this.container.focus();
	_this.container.addEventListener('keydown', function (event) {
		var curKeyCode = event.keyCode; 
		if (curKeyCode == 32) { // 空格
			event.preventDefault(); // 取消默认
			_this.changeState();
			return;
		}

		// 如果当前按键不在需求范围内，或者当前是暂停状态，不做处理
		if (!_this.keyCodeData[curKeyCode] || _this.isPause) {
			return;
		}
		event.preventDefault(); // 取消默认
		var tmpDirec = _this.keyCodeData[curKeyCode];
		var curDirec = _this.direc;
		// 逆反操作，不做处理
		if (
			(curDirec == 'up' && tmpDirec == 'down') ||
			(curDirec == 'down' && tmpDirec == 'up') ||
			(curDirec == 'left' && tmpDirec == 'right') ||
			(curDirec == 'right' && tmpDirec == 'left')
		) {
			return;
		}

		_this.stopLoop(); // 暂停自动
		_this.setDirec(tmpDirec); // 设置头部指向
		_this.run(); // 手动运行程序
		_this.loop(); // 手动运行后，继续自动运行程序
	}, false)
}

var gameEngine = new Engine();
gameEngine.setRule('getTd', function (tableContext) {
	var result = [];
	for (var len = tableContext.rows.length; len--;) {
		result[len] = tableContext.rows[len].cells;
	}
	return result;
});

gameEngine.setRule('renderTd', function (container) {
	container.setAttribute('tabIndex', -1);
	container.innerHTML = '';
	var rowLen = 20; colLen = 30; // 行列的数目和style中的样式相关
	var tdStr = '<table border="1" cellpadding="0" id="__game_table">';
	for (var i = 0; i < rowLen; i++) {
		tdStr += '<tr>';
		for (var j = 0;  j < colLen; j++) {
			tdStr += '<td></td>';
		}
		tdStr += '</tr>';
	}
	tdStr += '</table>';
	container.innerHTML = tdStr;
})

var gameContainer = Util.$('game_container'); // 获取游戏容器
gameEngine.runRule('renderTd', gameContainer); // 填充贪吃蛇的table
var tableElement = Util.$('__game_table', gameContainer); // 获取table
var alltdAddress = gameEngine.runRule('getTd', tableElement); // 获取所有的td的地址索引
var game = new Game(gameContainer, alltdAddress);
