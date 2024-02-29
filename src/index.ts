import { SerialPort } from "serialport";
const kmboxcommand = require("../kmboxcommand.json");

export enum KMBoxMouseType {
  RELEASE = 0,
  PHSYICAL = 1,
  SOFTWARE = 2,
  PHSYICAL_SOFTWARE = 3,
  VIEW = 0xff,
}

export enum KMBoxMouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

export default class KMBox {
  serial: SerialPort;
  constructor(serial: SerialPort) {
    this.serial = serial;
  }
  initlized = false;
  async initlize(waitBetweenLines = 10) {
    for (const data of kmboxcommand) {
      this.serial.write(`${data}\r\n`);
      await new Promise((resolve) => setTimeout(resolve, waitBetweenLines));
    }

    this.initlized = true;
  }

  base64_alphabet =
    "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm0123456789+/";

  customB64Encode(data: string) {
    let to_encode = data;

    let chunks_8bit = to_encode
      .split("")
      .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");

    let chunks_6bit = [];
    for (let i = 0; i < chunks_8bit.length; i += 6) {
      chunks_6bit.push(chunks_8bit.substr(i, 6));
    }

    let padding_amount = 6 - chunks_6bit[chunks_6bit.length - 1].length;
    chunks_6bit[chunks_6bit.length - 1] += "0".repeat(padding_amount);

    let encoded = chunks_6bit
      .map((bits) => this.base64_alphabet[parseInt(bits, 2)])
      .join("");
    encoded += "=".repeat(Math.floor(padding_amount / 2));

    return encoded;
  }

  customB64Decode(a: string): string {
    const ORIGINALENCODING =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let dt = atob(
      a
        .split("")
        .map((x) => {
          return ORIGINALENCODING[this.base64_alphabet.indexOf(x)];
        })
        .join("")
    );
    // remove if last char is 0x00
    if (dt.charCodeAt(dt.length - 1) === 0) {
      dt = dt.slice(0, -1);
    }
    return dt;
  }

  setBase64Alphabet(alphabet: string) {
    if (!this.initlized) {
      throw new Error("Not initlized");
    }
    if (alphabet.length !== 64) {
      throw new Error("Alphabet must be 64 characters long");
    }
    if (alphabet.includes("@")) {
      throw new Error("Alphabet cannot contain @");
    }
    if (alphabet.includes("=")) {
      throw new Error("Alphabet cannot contain =");
    }
    this.base64_alphabet = alphabet;
    this.serial.write(`\r\n\r\nnkb3('${alphabet}')\r\n\r\n`);
  }

  randBase64Alphabet() {
    const ables =
      "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890-[];',./<>?:\"{}_+\\|!#$%^&*()~";
    let alphabet = "";
    while (alphabet.length < 64) {
      let char = ables[Math.floor(Math.random() * ables.length)];
      if (!alphabet.includes(char)) {
        alphabet += char;
      }
    }

    this.setBase64Alphabet(alphabet);
  }

  send(data: string) {
    return new Promise<string>((resolve, reject) => {
      if (!this.initlized) {
        throw new Error("Not initlized");
      }
      let buf = "";
      let state: "WATCHING" | "RECIEVING" = "WATCHING";

      const datahandler = (msg: Buffer) => {
        buf += msg.toString();
        if (buf.includes("@=!@NKM0SPITER]!@")) {
          state = "RECIEVING";
          buf = buf.split("@=!@NKM0SPITER]!@")[1];
        }
        if (buf.includes("@=!@NKM1SPITER]!@") && state === "RECIEVING") {
          this.serial.off("data", datahandler);
          const data = buf.split("@=!@NKM1SPITER]!@")[0];
          const de = this.customB64Decode(data);
          resolve(de);
        }
      };
      this.serial.on("data", datahandler);
      this.serial.write(`r('${this.customB64Encode(data)}')\r\n`);
    });
  }

  /**
   * # Original
   *  用于鼠标的相对移动,设置鼠标相对于当前位置偏移(x,y)个单位:
   *    向右和向下移动10个单位:move(10,10)
   *    向左和向上移动10个单位:move(-10,-10)
   *    x,y允许的范围是-32767~+32767
   *  高级用法(轨迹模拟)：
   *    当move只给两个参数时，移动是一步到位，直接由起点到终点.中间没有任何过渡。横平竖直。如果需要模拟平滑过渡的轨迹移动.
   *  可以再多给一到三个参数来调节鼠标移动轨迹。用法详见用户手册。
   *  注意：如果想精确控制鼠标移动请关闭windows鼠标加速算法.
   *
   * # Google Translate
   * Used for relative movement of the mouse, set the mouse offset (x, y) units relative to the current position:
   *   Move 10 units right and down: move(10,10)
   *   Move 10 units left and up: move(-10,-10)
   *   The allowed range of x and y is -32767~+32767
   * Advanced usage (trajectory simulation):
   *   When move only gives two parameters, the movement is in one step, directly from the starting point to the end point. There is no transition in the middle. Horizontal and vertical. If you need to simulate a smooth transition of trajectory movement.
   * You can give one to three more parameters to adjust the mouse movement trajectory. See the user manual for usage details.
   * Note: If you want to control mouse movement accurately, please turn off the Windows mouse acceleration algorithm.
   */
  move(x: number, y: number, a: number) {
    return this.send(`km.move(${x},${y},${a})`);
  }

  moveAuto(x: number, y: number) {
    return this.send(`km.moveAuto(${x},${y})`);
  }

  /**
   * # Original
   * 用于控制和查询鼠标左键状态:
   *   没有参数时是查询鼠标左键状态，返回值 0：松开  1：物理按下 2：软件按下 3：物理软件均按下
   *   有参数时是设置鼠标左键状态,left(1)鼠标左键按下，left(0)鼠标左键松开
   *
   * # Google Translate
   * Used to control and query the status of the left mouse button:
   *   When there is no parameter, the status of the left mouse button is queried, and the return value is 0: Released 1: Physically pressed 2: Software pressed 3: Both physical and software pressed
   *   When there are parameters, the left mouse button state is set, left(1) the left mouse button is pressed, left(0) the left mouse button is released
   */
  left(type: KMBoxMouseType) {
    return this.send(`km.left(${type == KMBoxMouseType.VIEW ? "" : type})`);
  }

  /**
   * # Original
   * 用于控制和查询鼠标中键状态:
   *   没有参数时是查询鼠标中键状态，返回值 0：松开  1：物理按下 2：软件按下 3：物理软件均按下
   *   有参数时是设置鼠标中键状态,middle(1)中键按下，middle(0)中键松开
   *
   * # Google Translate
   * Used to control and query the status of the middle mouse button:
   *   When there is no parameter, the status of the middle mouse button is queried, and the return value is 0: Released 1: Physically pressed 2: Software pressed 3: Both physical and software pressed
   *   When there are parameters, the middle mouse button state is set. The middle button of middle(1) is pressed, and the middle button of middle(0) is released.
   */
  middle(type: KMBoxMouseType) {
    return this.send(`km.middle(${type == KMBoxMouseType.VIEW ? "" : type})`);
  }

  /**
   * # Original
   * 用于控制和查询鼠标右键状态:
   *   没有参数时是查询鼠标右键状态，返回值 0：松开  1：物理按下 2：软件按下 3：物理软件均按下
   *   有参数时是设置鼠标右键状态,right(1)右键按下，right(0)右键松开
   *
   * # Google Translate
   * Used to control and query the status of the right mouse button:
   *   When there is no parameter, the status of the right mouse button is queried, and the return value is 0: Released 1: Physically pressed 2: Software pressed 3: Both physical and software pressed
   *   When there are parameters, the right mouse button state is set. Right(1) right button is pressed, right(0) right button is released.
   */
  right(type: KMBoxMouseType) {
    return this.send(`km.right(${type == KMBoxMouseType.VIEW ? "" : type})`);
  }

  /**
   * # Original
   * 用于控制鼠标按键点击:
   *   输入参数有两个，第一个参数是指定鼠标单击哪个按键
   *   第二个参数是要点击多少次，没有第二个参数默认单击1次
   *   km.click(0):单击鼠标左键(效果等于：left(1)    left(0))
   *   km.click(1):单击鼠标右键(效果等于：right(1)   right(0))
   *   km.click(2):单击鼠标中键(效果等于：middle(1)) middle(0)
   *   鼠标左键单击10次写法：km.click(0,10)
   *
   * # Google Translate
   * Used to control mouse button clicks:
   *   There are two input parameters. The first parameter specifies which button to click with the mouse.
   *   The second parameter is how many times to click. Without the second parameter, the default is 1 click.
   *   km.click(0): Click the left mouse button (the effect is equal to: left(1) left(0))
   *   km.click(1): Right-click the mouse (the effect is equal to: right(1) right(0))
   *   km.click(2): Click the middle mouse button (the effect is equal to: middle(1)) middle(0)
   *   Click the left mouse button 10 times. Writing method: km.click(0,10)
   */
  click(type: KMBoxMouseButton, rep?: number) {
    return this.send(
      `km.click(${type}${
        typeof rep == "undefined" ? "" : "," + rep.toString()
      })`
    );
  }

  /**
   * # Original
   * 用于控制和查询鼠标侧键1的状态:
   *   没有参数时是查询侧键1状态，返回值 0：松开  1：物理按下 2：软件按下 3：物理软件均按下
   *   有参数时是设置侧键1状态,side1(1)侧键1按下，side1(0)侧键1松开
   *
   * # Google Translate
   * Used to control and query the status of mouse side button 1:
   *   When there is no parameter, the status of side button 1 is queried, and the return value is 0: Released 1: Physically pressed 2: Software pressed 3: Both physical and software pressed
   *   When there are parameters, the state of side button 1 is set. Side1(1) side button 1 is pressed, and side1(0) side button 1 is released.
   */
  side1(type: KMBoxMouseType) {
    return this.send(`km.side1(${type == KMBoxMouseType.VIEW ? "" : type})`);
  }

  /**
   * # Original
   * 用于控制和查询鼠标侧键2的状态:
   *   没有参数时是查询侧键2状态，返回值 0：松开  1：物理按下 2：软件按下 3：物理软件均按下
   *   有参数时是设置侧键2状态,side2(1)侧键2按下，side2(0)侧键2松开
   *
   * # Google Translate
   * Used to control and query the status of mouse side button 2:
   *   When there is no parameter, the status of side button 2 is queried, and the return value is 0: Released 1: Physically pressed 2: Software pressed 3: Both physical and software pressed
   *   When there are parameters, the state of side button 2 is set. Side2(1) side button 2 is pressed, side2(0) side button 2 is released.
   */
  side2(type: KMBoxMouseType) {
    return this.send(`km.side2(${type == KMBoxMouseType.VIEW ? "" : type})`);
  }

  /**
   * # Original
   * 用于控制和查询鼠标侧键3的状态:
   *   没有参数时是查询侧键3状态，返回值 0：松开  1：物理按下 2：软件按下 3：物理软件均按下
   *   有参数时是设置侧键3状态,side3(1)侧键3按下，side3(0)侧键1松开
   *
   * # Google Translate
   * Used to control and query the status of mouse side button 3:
   *   When there is no parameter, the status of side button 3 is queried, and the return value is 0: Released 1: Physically pressed 2: Software pressed 3: Both physical and software pressed
   *   When there are parameters, the state of side button 3 is set. Side3(1) side button 3 is pressed, side3(0) side button 1 is released.
   */
  side3(type: KMBoxMouseType) {
    return this.send(`km.side3(${type == KMBoxMouseType.VIEW ? "" : type})`);
  }

  /**
   * # Original
   * 用于控制和查询鼠标侧键4的状态:
   *  没有参数时是查询侧键4状态，返回值 0：松开  1：物理按下 2：软件按下 3：物理软件均按下
   *  有参数时是设置侧键4状态,side4(1)侧键4按下，side4(0)侧键1松开
   *
   * # Google Translate
   * Used to control and query the status of mouse side button 4:
   *  When there is no parameter, the status of side button 4 is queried, and the return value is 0: Released 1: Physically pressed 2: Software pressed 3: Both physical and software pressed
   *  When there are parameters, the state of side button 4 is set. Side4(1) side button 4 is pressed, and side4(0) side button 1 is released.
   */
  side4(type: KMBoxMouseType) {
    return this.send(`km.side4(${type == KMBoxMouseType.VIEW ? "" : type})`);
  }

  /**
   * # Original
   * 用于控制和查询鼠标侧键5的状态:
   *  没有参数时是查询侧键5状态，返回值 0：松开  1：物理按下 2：软件按下 3：物理软件均按下
   *  有参数时是设置侧键5状态,side5(1)侧键1按下，side5(0)侧键1松开
   *
   * # Google Translate
   * Used to control and query the status of mouse side button 5:
   *   When there is no parameter, the status of side button 5 is queried, and the return value is 0: Released 1: Physically pressed 2: Software pressed 3: Both physical and software pressed
   *   When there are parameters, the state of side button 5 is set. Press side button 1 of side5(1) and release side button 1 of side5(0).
   */
  side5(type: KMBoxMouseType) {
    return this.send(`km.side5(${type == KMBoxMouseType.VIEW ? "" : type})`);
  }

  /**
   * # Original
   * 鼠标滚轮设置：
   *   wheel(100) :滚轮上移动100个单位
   *   wheel(-100):滚轮下移动100个单位
   *   滚轮移动范围为：-127~+127
   *
   * # Google Translate
   * Mouse wheel settings:
   *   wheel(100): move 100 units on the wheel
   *   wheel(-100): move 100 units under the wheel
   *   The scroll wheel movement range is: -127~+127
   */
  wheel(move: number) {
    return this.send(`km.wheel(${move})`);
  }

  /**
   * @example
   * ```ts
   * const km = new KMBox(serial);
   * km.up(4);
   * km.up('a');
   * ```
   *
   * # Original
   * 软件强制松开指定按键:
   *   例如你按着键盘上的a不松，通过软件让a松开。可以有以下两种写法
   *   一:km.up('a') 输入参数是字符串a
   *   二:km.up(4)   输入参数是a的键值
   * PS:推荐使用键值类型，效率更高,速度更快
   *
   * # Google Translate
   * Software forces release of specified keys:
   *   For example, if you hold down a on the keyboard, use software to release a. It can be written in the following two ways
   *   1: km.up('a') The input parameter is the string a
   *   2: km.up(4) The input parameter is the key value of a
   * PS: It is recommended to use key-value type, which is more efficient and faster.
   */
  up(k: number | string) {
    return this.send(`km.up(${typeof k == "number" ? k : `'${k}'`})`);
  }

  /**
   * @example
   * ```ts
   * const km = new KMBox(serial);
   * km.down(4);
   * km.down('a');
   * ```
   *
   * # Original
   * 件强制指定按键一直按下:
   *   例如想让a键按着不松可以有以下两种写法
   *   一:km.down('a') 输入参数是字符串a
   *   二:km.down(4)   输入参数是a的键值
   * PS:推荐使用键值类型，效率更高,速度更快
   *
   * # Google Translate
   * To force a specified key to remain pressed:
   *   For example, if you want the A key to be pressed firmly, you can write it in the following two ways:
   *   1:km.down('a') The input parameter is the string a
   *   2: km.down(4) The input parameter is the key value of a
   * PS: It is recommended to use key-value type, which is more efficient and faster.
   */
  down(k: number | string) {
    return this.send(`km.down(${typeof k == "number" ? k : `'${k}'`})`);
  }

  /**
   * # Original
   * 软件强制单击指定按键:
   *   press()包括按下和松开两个动作,例如单击一次键盘a写法如下:
   *   一:km.press('a') 输入参数是字符串a
   *   二:km.press(4)   输入参数是a的键值
   *   press支持模拟手动操作，即控制一次按键按下的时间，press可以额外增加一个或者两个参数
   *   press(4,50)------两个参数，表示单击a键，a键按下时间50ms
   *   press(4,50,100)--三个参数，表示单击a键，a键按下时间50-100ms的随机值
   * PS:推荐使用键值类型，效率更高,速度更快，手动按键正常人速度约为8次每秒。如需模拟请设置合适的按下参数
   *
   * # Google Translate
   * Software forces click on specified button:
   *   press() includes two actions: pressing and releasing. For example, clicking the keyboard once is written as follows:
   *   1:km.press('a') The input parameter is the string a
   *   2: km.press(4) The input parameter is the key value of a
   *   Press supports simulating manual operation, that is, controlling the time of pressing a button. Press can add one or two additional parameters.
   *   press(4,50)------Two parameters, indicating that the a key is clicked, and the a key press time is 50ms
   *   press(4,50,100)--three parameters, indicating that when the a key is clicked, the a key press time is a random value of 50-100ms
   * PS: It is recommended to use the key value type, which is more efficient and faster. The normal speed of manual key pressing is about 8 times per second. If you need to simulate, please set the appropriate pressing parameters.
   */
  press(k: number | string): Promise<string>;
  /**
   * # Original
   * 软件强制单击指定按键:
   *   press()包括按下和松开两个动作,例如单击一次键盘a写法如下:
   *   一:km.press('a') 输入参数是字符串a
   *   二:km.press(4)   输入参数是a的键值
   *   press支持模拟手动操作，即控制一次按键按下的时间，press可以额外增加一个或者两个参数
   *   press(4,50)------两个参数，表示单击a键，a键按下时间50ms
   *   press(4,50,100)--三个参数，表示单击a键，a键按下时间50-100ms的随机值
   * PS:推荐使用键值类型，效率更高,速度更快，手动按键正常人速度约为8次每秒。如需模拟请设置合适的按下参数
   *
   * # Google Translate
   * Software forces click on specified button:
   *   press() includes two actions: pressing and releasing. For example, clicking the keyboard once is written as follows:
   *   1:km.press('a') The input parameter is the string a
   *   2: km.press(4) The input parameter is the key value of a
   *   Press supports simulating manual operation, that is, controlling the time of pressing a button. Press can add one or two additional parameters.
   *   press(4,50)------Two parameters, indicating that the a key is clicked, and the a key press time is 50ms
   *   press(4,50,100)--three parameters, indicating that when the a key is clicked, the a key press time is a random value of 50-100ms
   * PS: It is recommended to use the key value type, which is more efficient and faster. The normal speed of manual key pressing is about 8 times per second. If you need to simulate, please set the appropriate pressing parameters.
   */
  press(k: number | string, time: number): Promise<string>;
  /**
   * # Original
   * 软件强制单击指定按键:
   *   press()包括按下和松开两个动作,例如单击一次键盘a写法如下:
   *   一:km.press('a') 输入参数是字符串a
   *   二:km.press(4)   输入参数是a的键值
   *   press支持模拟手动操作，即控制一次按键按下的时间，press可以额外增加一个或者两个参数
   *   press(4,50)------两个参数，表示单击a键，a键按下时间50ms
   *   press(4,50,100)--三个参数，表示单击a键，a键按下时间50-100ms的随机值
   * PS:推荐使用键值类型，效率更高,速度更快，手动按键正常人速度约为8次每秒。如需模拟请设置合适的按下参数
   *
   * # Google Translate
   * Software forces click on specified button:
   *   press() includes two actions: pressing and releasing. For example, clicking the keyboard once is written as follows:
   *   1:km.press('a') The input parameter is the string a
   *   2: km.press(4) The input parameter is the key value of a
   *   Press supports simulating manual operation, that is, controlling the time of pressing a button. Press can add one or two additional parameters.
   *   press(4,50)------Two parameters, indicating that the a key is clicked, and the a key press time is 50ms
   *   press(4,50,100)--three parameters, indicating that when the a key is clicked, the a key press time is a random value of 50-100ms
   * PS: It is recommended to use the key value type, which is more efficient and faster. The normal speed of manual key pressing is about 8 times per second. If you need to simulate, please set the appropriate pressing parameters.
   */
  press(k: number | string, timeMin: number, timeMax: number): Promise<string>;
  /**
   * # Original
   * 软件强制单击指定按键:
   *   press()包括按下和松开两个动作,例如单击一次键盘a写法如下:
   *   一:km.press('a') 输入参数是字符串a
   *   二:km.press(4)   输入参数是a的键值
   *   press支持模拟手动操作，即控制一次按键按下的时间，press可以额外增加一个或者两个参数
   *   press(4,50)------两个参数，表示单击a键，a键按下时间50ms
   *   press(4,50,100)--三个参数，表示单击a键，a键按下时间50-100ms的随机值
   * PS:推荐使用键值类型，效率更高,速度更快，手动按键正常人速度约为8次每秒。如需模拟请设置合适的按下参数
   *
   * # Google Translate
   * Software forces click on specified button:
   *   press() includes two actions: pressing and releasing. For example, clicking the keyboard once is written as follows:
   *   1:km.press('a') The input parameter is the string a
   *   2: km.press(4) The input parameter is the key value of a
   *   Press supports simulating manual operation, that is, controlling the time of pressing a button. Press can add one or two additional parameters.
   *   press(4,50)------Two parameters, indicating that the a key is clicked, and the a key press time is 50ms
   *   press(4,50,100)--three parameters, indicating that when the a key is clicked, the a key press time is a random value of 50-100ms
   * PS: It is recommended to use the key value type, which is more efficient and faster. The normal speed of manual key pressing is about 8 times per second. If you need to simulate, please set the appropriate pressing parameters.
   */
  press(k: number | string, t1?: number, t2?: number) {
    if (typeof t1 === "undefined" && typeof t2 === "undefined") {
      return this.send(`km.press(${typeof k == "number" ? k : `'${k}'`})`);
    } else if (typeof t1 !== "undefined" && typeof t2 === "undefined") {
      return this.send(
        `km.press(${typeof k == "number" ? k : `'${k}'`},${t1})`
      );
    } else {
      return this.send(
        `km.press(${typeof k == "number" ? k : `'${k}'`},${t1},${t2})`
      );
    }
  }

  /**
   * # Original
   * 产生随机函数:
   *   无参数是产生一个随机数,km.rng()
   *   2个参数是产生一个指定范围内的随机数，例如需要一个100-200之间的随机数,km.rng(100,200)
   *
   * # Google Translate
   * Generate a random function:
   *   No parameters are used to generate a random number, km.rng()
   *   The two parameters are to generate a random number within a specified range, for example, a random number between 100-200 is required, km.rng(100,200)
   */
  rng(min: number, max: number) {
    return this.send(`km.rng(${min},${max})`);
  }
}
