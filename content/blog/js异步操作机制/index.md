---
title: js异步操作机制
date: 2019-01-01 17:45:14
tags:
---
# 一、结合生成器的异步任务执行器
## 生成器和迭代器的简介
   **迭代器**是一种特殊对象，它具有一些专门为迭代过程设计的专有接口，所有的迭代器对象都有一个next()方法，每次调用都返回一个结果对象。结果对象有两个属性：一个是value，表示下一个将要返回的值；另一个是done，它是一个布尔类型的值，当没有更多可返回数据时返回true。迭代器还会保存一个内部指针，用来指向当前集合中值的位置，每调用一次next()方法，都会返回下一个可用的值
    
　　如果在最后一个值返回后再调用next()方法，那么返回的对象中属性done的值为true，属性value则包含迭代器最终返回的值，这个返回值不是数据集的一部分，它与函数的返回值类似，是函数调用过程中最后一次给调用者传递信息的方法，如果没有相关数据则返回undefined
    **生成器**是一种返回迭代器的函数，通过function关键字后的星号(*)来表示，函数中会用到新的关键字yield。星号可以紧挨着function关键字，也可以在中间添加一个空格。
// 生成器

```
function *createIterator() {
    yield 1;
    yield 2;
    yield 3;
}
```

// 生成器能像正规函数那样被调用，但会返回一个迭代器
```
let iterator = createIterator();
console.log(iterator.next().value); // 1
console.log(iterator.next().value); // 2
console.log(iterator.next().value); // 3
```
可迭代对象具有Symbol.iterator属性，是一种与迭代器密切相关的对象。Symbol.iterator通过指定的函数可以返回一个作用于附属对象的迭代器。在ES6中，所有的集合对象(数组、Set集合及Map集合)和字符串都是可迭代对象，这些对象中都有默认的迭代器。ES6中新加入的特性for-of循环需要用到可迭代对象的这些功能

## 异步任务执行器
   生成器令人兴奋的特性多与异步编程有关，JS中的异步编程有利有弊：简单任务的异步化非常容易；而复杂任务的异步化会带来很多管理代码的挑战。由于生成器支持在函数中暂停代码执行，因而可以深入挖掘异步处理的更多用法
```
function run(taskDef) {
    // 创建迭代器，让它在别处可用
    let task = taskDef();
    // 启动任务
    let result = task.next();
    // 递归使用函数来保持对 next() 的调用
    function step() {
        // 如果还有更多要做的
        if (!result.done) {
            if (typeof result.value === "function") {
                result.value(function(err, data) {
                    if (err) {
                        result = task.throw(err);
                        return;
                    }
                    result = task.next(data);
                    step();
                });
            } else {
                result = task.next(result.value);
                step();
            }
        }
    }
    // 开始处理过程
    step();
}
```
# 二、Promise和异步编程
## promise简介
每个Promise都会经历一个短暂的生命周期：先是处于进行中(pending)的状态，此时操作尚未完成，所以它也是未处理(unsettled)的；一旦异步操作执行结束，Promise则变为已处理(settled)的状态

　　在之前的示例中，当readFile()函数返回promise时它变为pending状态，操作结束后，Promise可能会进入到以下两个状态中的其中一个

### 1、Fulfilled
　　Promise异步操作成功完成
### 2、Rejected
　　由于程序错误或一些其他原因，Promise异步操作未能成功

　　内部属性[[PromiseState]]被用来表示Promise的3种状态："pending"、"fulfilled"及"rejected"。这个属性不暴露在Promise对象上，所以不能以编程的方式检测Promise的状态，只有当Promise的状态改变时，通过then()方法来采取特定的行动

　　所有Promise都有then()方法，它接受两个参数：第一个是当Promise的状态变为fulfilled时要调用的函数，与异步操作相关的附加数据都会传递给这个完成函数(fulfillment function)；第二个是当Promise的状态变为rejected时要调用的函数，其与完成时调用的函数类似，所有与失败状态相关的附加数据都会传递给这个拒绝函数(rejection function)
## promise执行异步任务
```
function run(taskDef) {
    // 创建迭代器
    let task = taskDef();
    // 启动任务
    let result = task.next();
    // 递归使用函数来进行迭代
    (function step() {
        // 如果还有更多要做的
        if (!result.done) {
            // 决议一个 Promise ，让任务处理变简单
            let promise = Promise.resolve(result.value);
            promise.then(function(value) {
                result = task.next(value);
                step();
            }).catch(function(error) {
                result = task.throw(error);
                step();
            });
        }
    }());
}
```
// 定义一个函数来配合任务运行器使用


```
function readFile(filename) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, function(err, contents) {
            if (err) {
                reject(err);
            } else {
                resolve(contents);
            }    
        });
    });
}
```
// 运行一个任务

```
run(function*() {
    let contents = yield readFile("config.json");
    doSomethingWith(contents);
    console.log("Done");
});
```

# 三、async函数构建异步操作
## async函数是什么
async函数就是将 Generator 函数的星号（*）替换成async，将yield替换成await，仅此而已
async函数对 Generator 函数的改进，体现在以下四点

### 1、内置执行器

　　Generator 函数的执行必须靠执行器，所以才有了co模块，而async函数自带执行器。也就是说，async函数的执行，与普通函数一模一样，只要一行

var result = asyncReadFile();
　　上面的代码调用了asyncReadFile函数，然后它就会自动执行，输出最后结果。这完全不像 Generator 函数，需要调用next方法，或者用co模块，才能真正执行，得到最后结果

### 2、更好的语义

async和await，比起星号和yield，语义更清楚了。async表示函数里有异步操作，await表示紧跟在后面的表达式需要等待结果

### 3、更广的适用性

co模块约定，yield命令后面只能是 Thunk 函数或 Promise 对象，而async函数的await命令后面，可以是Promise 对象和原始类型的值（数值、字符串和布尔值，但这时等同于同步操作）

### 4、返回值是 Promise

async函数的返回值是 Promise 对象，这比 Generator 函数的返回值是 Iterator 对象方便多了。可以用then方法指定下一步的操作。

　　进一步说，async函数完全可以看作多个异步操作，包装成的一个 Promise 对象，而await命令就是内部then命令的语法糖
　　
　　async 函数的实现原理，就是将 Generator 函数和自动执行器，包装在一个函数里
```
async function fn(args) {
  // ...
}
// 等同于
function fn(args) {
  return spawn(function* () {
    // ...
  });
}
```
　　所有的async函数都可以写成上面的第二种形式，其中的spawn函数就是自动执行器。
　　下面给出spawn函数的实现，基本就是前文自动执行器的翻版
```
function spawn(genF) {
  return new Promise(function(resolve, reject) {
    var gen = genF();
    function step(nextF) {
      try {
        var next = nextF();
      } catch(e) {
        return reject(e);
      }
      if(next.done) {
        return resolve(next.value);
      }
      Promise.resolve(next.value).then(function(v) {
        step(function() { return gen.next(v); });
      }, function(e) {
        step(function() { return gen.throw(e); });
      });
    }
    step(function() { return gen.next(undefined); });
  });
}
```

## async函数实现异步操作的实例
```
async function logInOrder(urls) {
  // 并发读取远程URL
  const textPromises = urls.map(async url => {
    const response = await fetch(url);
    return response.text();
  });
```
// 按次序输出
```
for (const textPromise of textPromises) {
    console.log(await textPromise);
  }
}
```




