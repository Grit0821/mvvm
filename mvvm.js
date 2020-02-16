// 观察者模式（发布订阅模式）
class Dep { // Dependency 收集依赖，通知订阅者
  constructor() {
    this.subs = [] // 存放所有的watcher
  }
  // 收集watcher
  addSub(watcher) { // 添加watcher
    this.subs.push(watcher)
  }
  // 通知watcher
  notify() {
    this.subs.forEach(watcher => watcher.update())
  }
}
class Watcher {
  constructor(vm, expr, cb) { // cb callback
    this.vm = vm
    this.expr = expr
    this.cb = cb
    // 默认存放一个老值
    this.oldValue = this.get()
  }
  get() {
    Dep.target = this
    // 取值的时候 给watcher添加数据
    let value = CompileUtil.getVal(this.vm, this.expr)
    Dep.target = null
    return value
  }
  update() { // 更新，数据变化后会调用观察者的update方法
    let newVal = CompileUtil.getVal(this.vm, this.expr)
    if (newVal !== this.oldValue) {
      this.cb(newVal)
    }
  }
}

class Observer { // 实现数据劫持
  constructor(data) {
    this.observer(data)
  }
  observer(data) {
    // 类型检查，是对象在观察
    if (data && typeof data === 'object') {
      for (let key in data) {
        this.defineReactive(data, key, data[key])
      }
    }
  }
  defineReactive(obj, key, value) {
    this.observer(value) // 深度递归
    let dep = new Dep() // 给每个属性都添加一个发布订阅功能
    Object.defineProperty(obj, key, {
      get() {
        // 创建watcher时，会取到对应内容，把watcher放到Dep.target上
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set: (newVal) => {
        if (newVal !== value) {
          this.observer(newVal) // newVal是对象也得观察，深度递归
          value = newVal
          dep.notify()
        }
      }
    })
  }
}

// 基类
class Compiler {
  constructor(el, vm) {
    // 判断el是不是dom元素，如果是str,需要获取它
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    this.vm = vm
    // 获取当前节点中的元素放到内存中
    let fragment = this.node2fragment(this.el)
    // 把节点中的内容进行替换
    // 用数据编译模板
    this.compile(fragment)
    // 替换后，内容再放到页面里
    this.el.appendChild(fragment)
  }

  isElementNode(node) {
    return node.nodeType === 1
  }

  node2fragment(node) { // 
    // 创建文档碎片
    let fragment = document.createDocumentFragment()
    let firstChild
    while (firstChild = node.firstChild) {
      // appendChild 具有移动性
      fragment.appendChild(firstChild)
    }
    return fragment
  }

  // 根据属性名判断是不是指令，例如v-model
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }

  // 编译元素
  compileElement(node) {
    let attributes = node.attributes
    Array.from(attributes).forEach(attr => {
      let { name, value: expr } = attr // expr 'school.name'
      if (this.isDirective(name)) { // 判断是不是指令 v-
        let [, directive] = name.split('-')
        // 调用不同的指令来处理
        CompileUtil[directive](node, expr, this.vm)
      }
    });
  }

  // 编译文本
  compileText(node) {
    let content = node.textContent
    if (/\{\{(.+?)\}\}/.test(content)) {
      // 文本节点
      CompileUtil['text'](node, content, this.vm)
    }
  }

  // 核心编译方法
  compile(node) { // 用来编译fragment中的dom
    let childNodes = node.childNodes // NodeList是类数组对象
    childNodes.forEach(child => {
      if (this.isElementNode(child)) {
        this.compileElement(child)
        // 如果是元素节点，需要递归编译自己
        this.compile(child)
      } else {
        this.compileText(child)
      }
    });
  }
}

CompileUtil = { // 可省略var，表示全局对象
  // 根据表达式取得vm上对应的数据
  getVal(vm, expr) { // vm.$data  'school.name'
    return expr.split('.').reduce((data, current) => {
      return data[current]
    }, vm.$data)
  },
  setValue(vm, expr, value) { // school.name 'dlut'
    expr.split('.').reduce((data, current, index, arr) => {
      if (index === arr.length - 1) {
        return data[current] = value
      }
      return data[current]
    }, vm.$data)
  },
  // 解析v-model指令
  model(node, expr, vm) { // 节点，表达式school.name，当前实例 vm
    // 给input设置value属性 node.value = xxx
    let fn = this.updater['modelUpadater']
    new Watcher(vm, expr, (newVal) => { // 给输入框加一个观察者
      // 如果数据更新会触发此方法，赋予新值
      fn(node, newVal)
    })
    node.addEventListener('input', (e) => {
      let value = e.target.value // 获取输入的内容
      this.setValue(vm, expr, value)
    })
    let value = this.getVal(vm, expr)
    fn(node, value)
  },
  html() {
    // node.innerHTML = xxx
  },
  getContentValue(vm, expr) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(vm, args[1])
    })
  },
  text(node, expr, vm) { // expr: {{a}} {{b}}
    let fn = this.updater['textUpdater']
    let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      // 给每个{{}}里面内容都加上观察者
      new Watcher(vm, args[1], () => {
        fn(node, this.getContentValue(vm, expr))
      })
      return this.getVal(vm, args[1])
    })
    fn(node, content)
  },
  updater: {
    // 把数据插入到input节点中
    modelUpadater(node, value) {
      node.value = value
    },
    htmlUpdater() {

    },
    // 处理文本节点内容
    textUpdater(node, value) {
      node.textContent = value
    }
  }
}

class Vue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    // 根元素el存在，根据数据编译模板
    if (this.$el) {
      // 遍历data上的属性，全部用Object.defineProperty来定义
      new Observer(this.$data)
      // 把数据获取操作vm上的取值都代理到vm.$data上
      this.proxyVm(this.$data)
      new Compiler(this.$el, this)
    }
  }
  proxyVm(data){ // 通过vm.shool 取到 vm.$data.school
    for(let key in data){
      Object.defineProperty(this, key,{
        get(){
          return data[key]
        }
      })
    }
  }
} 