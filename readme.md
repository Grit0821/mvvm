vue 是常见的 mvvm 框架，实现数据，视图双向绑定的原理主要是数据劫持结合发布-订阅模式，通过 Object.defineProperty 来劫持 data 各个的属性，属性初始化取值时添加订阅，属性取值变化时触发 setter 通知订阅触发回调更新视图

下面根据 vue 的源码，实现简易版本的 mvvm，使用方式和 vue 一样，主要实现 v-model 命令和 {{}} 文本插值，使用方式如下：

```html
<body>
  <div id="app">
    <input type="text" v-model="school.name">
    {{school.name}}
    <div>{{school.name}}</div>
    <div>{{school.age}}</div>
  </div>
  <script src="mvvm.js"></script>
  <script>
    let vm = new Vue({
      el:'#app',
      data:{
        school:{
          name:'大连理工',
          age: 70
        }
      }
    })
  </script>
</body>

```

# 整体思路

<img src="https://upload-images.jianshu.io/upload_images/12955144-8b6fadb33056e624.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240" alt="mvvm.png" style="zoom:80%;" />

整体思路如上图所示：

新建 mvvm 实例 是整个程序的入口，在新建过程中

首先用 Observer 劫持 data 所有属性：

1. 创建 Dep 实例 dep，Dep是用来收集订阅和通知订阅更新
2. 创建 getter，若 Dep.target 存在，dep 添加订阅 watcher
3. 创建 setter，如果触发 setter，通过 dep 通知 watcher 更新

然后创建 Compiler 结合 data 进行模板编译：

 1. 解析到编译的数据，每个数据创建watcher，在创建过程中：

    ​	Dep.target 指向创建的watcher，

    ​	取值时触发 getter，给 dep 添加订阅 

    ​	Dep.target  = null 解除引用

 2. 根据 data 编译模板渲染到页面，初始化视图

完成之后，数据变化 —— 触发 setter，setter 里调用 dep.notify() —— dep 通知所有订阅的 watcher 更新 —— 更新视图





