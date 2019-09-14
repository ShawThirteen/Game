class UI {
	constructor (id) {
		this.factory(this);
		this.container = this.$(id);
	}

	factory (obj) {
		var _this = this;
		var eventList = {
			$ (id) {
				var node = document.getElementById(id);
				_this.factory(node);
				return node;
			},
			find (tagName) {
				var list = obj.getElementsByTagName(tagName);
				for (var i = 0, len = list.length; i < len; i++) {
					_this.factory(list[i]);
				}
				return list;
			},
			append (str) {
				obj.innerHTML += str;
			}
		}

		for (var o in eventList) {
			obj[o] = eventList[o];
		}
		return obj;
	}

	_headerModel (chips, commission) {
		var result = [
			'<div id="headerWrap">',
				'<label>底注： <span id="chips">'+ chips +'</span></label>',
				'<label>佣金： <span id="commission">'+ commission +'</span></label>',
			'</div>'
		];
		return result.join('');
	}
	_bodyModel (chips, count) {
		var result = [
			'<div id="bodyWrap">',
				'<label>当前底注:<span id="currentChips">'+ chips +'</span></label>',
				'<label>总金额:<span id="count">'+ count +'</span></label>',
			'</div>',
			'<div id="countDown_wrap">倒计时:<span id="countDown">60</span></div>'
		];
		return result.join('');
	}

	render(type, ...args) {
		type = type.toLowerCase();
		var _this = this;
		var fnMap = {
			header: _this._renderHeader,
			body: _this._renderBody,
			footer: _this._renderFooter
		}

		fnMap[type].bind(_this)(...args);
	}

	_renderHeader (chips, commission) {
		this.container.append(this._headerModel(chips, commission));
		this.headerElment = this.container.$('headerWrap');
	}

	_renderBody (chips, count) {
		this.container.append(this._bodyModel(chips, count));
		this.bodyElement = this.container.$('bodyWrap');
	}

	_renderFooter (userList) {
		this.container.append(this._footerModel(userList));
		this.footerElement = this.container.$('footerWrap');
		this._bindFooter(userList);
	}

	_addLi (userCfg) {
		var $ul = this.footerElement.find('ul')[0];
		$ul.append(this._liModel(userCfg));
		var liList = $ul.find('li');
		this._bindLi(userCfg, liList[liList.length - 1]);
	}

	_bindFooter (userList) {
		var $ul = this.footerElement.find('ul')[0];
		var $liList = $ul.find('li');

		this.each($liList, (item, index) => {
			var curUser = userList[index];
			this._bindLi(curUser, item);
		})
	}

	_bindLi (curUser, liNode) {
		var $btnWrap = liNode.find('div')[0];

		$btnWrap.addEventListener('click', (event) => {
			var $target = event.target;
			var curType = $target.getAttribute('action');
			switch (curType) {
				case 'add':
					var num = prompt('追加金额：', 100);
					curUser.emit(curType, num);
					break
				case 'follow':
				case 'see':
				case 'giveup':
				default:
					curUser.emit(curType);
					break;
			}
			
		}, false)
	}

	each (arr, callback) {
		for (var i = 0, len = arr.length; i < len; i++) {
			callback(arr[i], i);
		}
	}

	upDate (type, ...args) {
		type = type.toLowerCase();
		var fnMap = {
			body: this._upDateBod,
			footer: this._upDateFooter,
			time: this._upDateCountDown
		}

		fnMap[type].bind(this)(...args);
	}

	_upDateBody (chips, count) {
		this.bodyElement.$('currentChips').innerHTML = chips;
		this.bodyElement.$('count').innerHTML = count;
	}

	_upDateFooter (userOptions) {
		var $li = this.footerElement.$(userOptions.id);
		$li.$(userOptions.id + '_money').innerHTML = userOptions.money;
	}

	_upDateCountDown (time) {
		this.bodyElement.$('countDown').innerHTML = time;
	}

	_footerModel (userList) {
		var result = [
			'<div id="footerWrap">',
				this._userListModel(userList),
			'</div>'
		];
		return result.join('');
	}

	_userListModel (userList) {
		var result = ['<ul>'];
		for (var i = 0, len = userList.length; i < len; i++) {
			result.push(this._liModel(userList[i]));
		}

		result.push('</ul>');
		return result.join('')
	}
	_liModel (options) {
		var result = [
			'<li id="'+ options.id +'">',
				'<div id="'+ options.id +'_action">',
					'<button action="see">看</button>',
					'<button action="follow">跟</button>',
					'<button action="pluse">加</button>',
					'<button action="open">开</button>',
					'<button action="giveup">弃</button>',
				'</div>',
				'<div class="userName">用户名:<span>'+ options.userName +'</span></div>',
				'<div class="remain"> 余额:<span id="'+ options.id +'_money">'+ options.money +'</span></div>',
			'</li>',
		];
		return result.join('');
	}
}

window.UIClass = function () {
	var instance = null;

	return function (id) {
		if (!instance) {
			instance = new UI(id);
		}
		return instance;
	}
}()


/*
* 基础规则
* 豹子 > 同花 > 对子 > 大于散牌 > 235 > 豹子
*/

class JinHua {
	/*
	* @params wrapId [String] 渲染ui的容器id
	*/
	constructor (wrapId) {
		this.card = this.generate();  // 生成一副牌
		this.activeCard = this.card.slice();	// 当前使用中的牌	
		this.fresh(); 	// 花牌
		this.user = [];	// 存储当前用户
		this.activeUser = [];	// 当前未结束用户
		this.banker = 0;	// 庄家
		this.system = {// 存储当前程序的拥有者信息
			pool: 0   			// 系统赚取的佣金总数
		};	

		this.pool = 0;		// 注池

		// 配置静态属性
		this.config = {
			commission: 0.05,	// 佣金
			chips: 5,			// 底注筹码
			doorNum: 100		// 当前对局准入门槛
		}
		this.config.curChips = this.config.chips;

		this.UI = new UIClass(wrapId);
	}
	_renderUI () {
		this.UI.render('header', this.config.chips, this.config.commission);	// 渲染头部
		this.UI.render('body', this.config.curChips, this.pool);
		this.UI.render('footer', this.user);
	}

	/*
	* 生成扑克牌
	* 扎金花不需要大小王
	*/
	generate () {
		var result = [];
		var cardType = function (number, memery) {
			var typeArr = ['黑桃', '红桃', '方块', '梅花'];
			var value = '';		// 牌面
			switch (number) {
				case 11:
					value = 'J';
					break;
				case 12:
					value = 'Q';
					break;
				case 13:
					value = 'K';
					break;
				case 14:
					value = 'A';
					break;
				default:
					value = number;
					break;
			}
			for (var i = 0; i < 4; i++) {
				memery.push({
					number: number,
					value: value,
					type: typeArr[i]
				})
			}
		}

		for (var i = 0; i < 13; i++) {
			// 这里加2是为了以后方便排序，A是所有牌中最大的
			cardType(i + 2, result);
		}
		return result;
	}

	// 洗牌
	fresh () {
		var cardLen = this.activeCard.length;
		var _this = this;
		var swap = function (source, target) {
			[_this.activeCard[source], _this.activeCard[target]] = [_this.activeCard[target], _this.activeCard[source]];
		}

		for (var i = 0; i < cardLen; i++) {
			var curCard = Math.floor(Math.random() * cardLen);	// 当前随机到了第几张
			swap(i, curCard);
		}
	}

	// 发牌
	deal () {
		for (var i = 0; i < 3; i++) {
			this._loopUser(this.user, (curUser, i) => {
				curUser.card && curUser.card.push(this.activeCard.pop()) || (curUser.card = [this.activeCard.pop()]);
			})
		}

		this._loopUser(this.user, (curUser, i) => {
			curUser.card.sort((pre, next) => {
				return next.number - pre.number;
			})
			curUser.emit('see');
		})
	}

	// 开局
	start () {
		// 检验用户
		this._loopUser(this.user, (curUser, i) => {
			if (curUser.money < this.doorNum) {
				this.userExit(i--);
				alert(user.userName + '出局');
			} else {
				if (curUser.balance.given > this.config.curChips) {
					curUser.balance.given -= this.config.curChips;
				} else {
					var remain = this.config.curChips - curUser.balance.given;
					curUser.balance.given = 0;
					curUser.balance.recharge -= remain;
				}
				this.pool += this.config.curChips;
			}
			curUser.money = curUser.balance.given + curUser.balance.recharge;	// 归总用户的资金

			// 所有用户都有随时看自己牌的权力
			curUser.on('see', () => {
				var cardArr = [];
				curUser.card.forEach((item, index) => {
					cardArr.push(item.type + item.value);
				})
				console.log(cardArr);
				curUser.isLay = true;
			})

			return i;
		});
		this.activeUser = this.user.slice();		// 存储对局中用户
		this.activeCard = this.card.slice();		// 重新获取牌
		this.activeIndex = 0;	// 当前正在操作中的用户索引
		this.fresh();	// 洗牌
		this.deal(); 	// 发牌

		this.delay(0.1, () => {	// 两秒后开始游戏，并进行读秒
			this._renderUI();
			this._loopGame();
		})
	}

	_loopGame () {
		var activeUser = this.action();
		this.countDown(() => {
			activeUser.emit('giveup');
			this._loopGame();
		})
	}

	// 倒计时
	countDown (callback) {
		var time = 6000;
		clearInterval(this.countDownTimer);
		this.UI.upDate('time', time);
		this.countDownTimer = setInterval(() => {
			if (--time <= -1) {
				time = null;
				clearInterval(this.countDownTimer);
				this.UI.upDate('time', 60);

				callback();
			} else {
				this.UI.upDate('time', time);
			}
		}, 1e3)
	}

	delay (time, callback) {
		setTimeout(callback, time * 1e3);
	}	
	over () {
		// 将注池的钱分给赢的用户，并抽取佣金
		var commission = this.pool * this.commission;
		var remain = this.pool - commission;
		this.system.pool += commission;	// 存储系统赚取的佣金

		this.activeUser[0].recharge(remain);	// 只有最后一个赢的人才能拿钱
		this.pool = 0;	// 清零
		this.check();	// 当前对局结束后，清除不够资格的人
	}

	/*
	* 用户退出
	* @parmas index [Number] 用户在数组中的索引
	*/
	userExit (index) {
		this.user.splice(index, 1);		// 删除当前局中的用户
	}


	// 校验当前是否有人需要出局
	check () {
		this._loopUser(this.user, (curUser, i) => {
			if (curUser.balance.given + curUser.balance.recharge < this.doorNum) {
				this.user.splice(i, 1);
				return --i;
			} 
		})
	}

	/*
	* @method:private _loopUser 简化用户组的循环操作
	* @params arr [Array] 待循环的数组
	* @params cb [Callback] 调用的返回值
	* @return.cb [Number/undefined] 是否需要重新赋值给i,返回为空则不赋值
	*/
	_loopUser (arr, cb) {
		var userLen = arr.length;
		for (var i = 0; i < userLen; i++) {
			var curUser = arr[i];
			i = cb(curUser, i) || i;
		}
	}

	/*
	* 添加玩家
	* @params user [Account] 传入的账户类实例
	*/
	addUser (user) {
		var balance = user.balance.given + user.balance.recharge;	// 余额
		if (balance < this.doorNum) {
			alert('当前用户未达到准入门槛');
			return;
		}

		// 最多允许14个人
		this.user.length < 14 && this.user.push(user);
	}

	/*
	* 设置游戏对局条件
	*/
	setLimit (option) {
		for (var o in option) {
			if (o in this.config) {
				switch (o) {
					case 'commission': 	// 佣金设置特殊处理
						this.config[o] = option[o] / 100;
						break;
					default:
						this.config[o] = option[o];
				}
			}
		}
	}

	/*
	* 用户操作，进行下注，看牌等操作
	* 明，跟，加，看，开，弃
	*/
	action () {
		var activeUser = this.activeUser[this.activeIndex];
		activeUser
			.on('giveup', () => {
				this.activeUser.splice(this.activeIndex--, 1);
				activeUser.emit('over');
			})
			.on('follow', (cb) => {
				var ret = this.bet(activeUser, this.config.curChips * (activeUser.isLay && 2 || 1));
				cb && cb(ret);
			})
			.on('add', (num) => {
				if (num < this.config.chips) {
					alert('不能低于底注');
					return;
				}
				activeUser.emit('follow', (ret) => {
					if (ret) {
						var success = this.bet(activeUser, num);
						if (success) {
							// 如果当前用户已经自己看过牌了，那么底注增加add的一半
							this.config.curChips += num / (activeUser.isLay && 2 || 1);
						}
					}
				})
			})
			.on('overtime', () => {	// 超时等于弃权
				activeUser.emit('giveup');
			})
			.on('over', () => {	// 结束后进入下一步操作
				if (this.activeIndex++ >= this.activeUser.length) {	// 当前用户就是末尾用户
					this.activeIndex = 0;	// 新一轮循环
				}
				curUser.clear(null, ['see']);	// 清除当前用户身上绑定的事件
			})
		activeUser.beforeEmit = (ev) => {
			var stopCountDonw = ['follow', 'add', 'over'];
			if (stopCountDonw.indexOf(ev) > -1) {
				clearInterval(this.countDownTimer);
				this._loopGame();
			}
		}
		return activeUser;
	}

	// 下注
	bet (user, count) {
		var given = user.balance.given;
		var recharge = user.balance.recharge;
		if (given > count) {
			user.given -= count;
		} else if (given + recharge > count) {
			alert('当前金额不足');
			return false;
		} else {
			user.balance.given = 0;
			user.balance.recharge -= (count - given);
		}
		return true;
	}
}

class EventListener {
	constructor () {
		this._attach = {};
	}

	on (ev, callback) {
		this._attach[ev] && this._attach[ev].push(callback) || (this._attach[ev] = [callback]);
		return this;
	}

	emit (ev, ...arg) {
		this.beforeEmit && this.beforeEmit(ev);

		this._loopEvent(ev, (curEv, index) => {
			curEv.bind(this)(...arg);
		})
	}

	remove (ev, callback) {
		callback &&
		this._loopEvent(ev, (curEv, index) => {
			return curEv == ev && this._attach[ev].splice(index, 1);
		}) ||
		(this._attach[ev] = []);
	}

	/*
	* @params remove [Array] 待移除的事件
	* @params keey [Array] 跳过
	*/
	clear (remove, keep) {
		if (remove) {
			remove.forEach((item, index) => {
				delete this._attach[item];
			})
		} else {
			if (keep) {
				var curObj = {};
				keep.forEach((item, index) => {
					curObj[item] = this._attach[item];
				})
				this._attach = curObj;
			} else {
				this._attach = {};
			}
		}
	}

	_loopEvent (ev, cb) {
		for (var i = 0, len = this._attach[ev].length; i < len; i++) {
			var curEv = this._attach[ev][i];
			cb(curEv, i);
		}
	}
}

/*
* 用户的账户类
*/
class Account extends EventListener {
	constructor (name, id) {
		super();
		var _this = this;
		this.id = id || name;	// 用户id
		this.userName = name;
		// 余额
		this.balance = {
			given: 100,	// 初始账户默认赠与100
			recharge: 0
		};
		this.isActive = false;	// 当前用户是不是在读秒中
		this.isLay = false; 	// 是否看过牌
	}

	/*
	* 充值
	*/
	recharge (count, isGive) {
		if (isGive) {
			this.balance.given += count;
		} else {
			this.balance.recharge += count;
		}
	}
}