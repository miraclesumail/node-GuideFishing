/**
 * Created by yangw on 2016/11/16.
 * 课程直播模式
 * 引用socket.io
 */

// 解码中文url
var url = require('url');
// 文件操作模块
var fs = require('fs');
// 定位文件
var locateFromRoot = require('./tools/LocateFromRoot');
// 获取当前时间
var getDate = require('./tools/GetDate');
// 存储直播课程数据
var Course = require('./Course');
// 课程直播
var CourseBroadcastData = require('./CourseBroadcastData');
// 初始化观察者方法
var ObserverInit = require('./tools/ObserverInit');

// 课程直播模块
function courseBroadcastAction(io){

    // 保存所有聊天室房间的组数 -- 在全局范围下
    var roomUser = [];
    // 所有聊天室的原始消息记录,以便数据库保存数据 -- 在全局范围下
    var courseOrigin = [];

    // 客户端新建连接
    io.on('connection', function (socket) {
        // 客户端的socket对象在断开后会自动重连,
        // 也就是说只需要保存服务器端的socket连接信息
        // 每个socket连接都有其固有的属性 -- isAdmin

        console.log('new socket connection coming...');
        // 该客户端上传的文件
        var Files = {};
        try {
            // 获取当前用户连接的url进一步获取url房间号
            var url = socket.request.headers.referer;
            // 分割地址字符串,数组的最后一个设置成房间号
            var split_arr = url.split('/');

            var roomId = split_arr[split_arr.length - 1];
            // 解码中文字符
            roomId = decodeURIComponent(roomId);
            console.log('roomId: ' + roomId);

        }catch (e){
            roomId = '测试';
            console.log(e);
        }

        // 用户姓名
        var user = {
            name: '',
            isAdmin: ''
        };

        // 初始化当前课程数据,包括观察者和媒体数据以及数据索引编号
        if(!courseOrigin[roomId]){

            courseOrigin[roomId] = {
                index: 1,
                // 将观察者和数据放在同一个this作用域下便于读取数据
                medias: [],
                watcherList: [],
                watcherListen: function (type, fn) { },
                watcherTrigger: function (type, args) { },
                watcherRemove: function (type, fn) { }
            };
            // 初始化观察者并开启监听
            ObserverInit(courseOrigin[roomId]);

            // 在全局变量中保存当前直播课程的信息
            // let -- ECMAScript6关键字,制造块级作用域
            let videosListen = function(videoInfo) {

                this.medias.push(videoInfo);
                this.index += 1;
            }
            let imagesListen = function (imageInfo) {

                this.medias.push(imageInfo);
                this.index += 1;
            }
            let audiosListen = function (audioInfo) {

                this.medias.push(audioInfo);
                this.index += 1;
            }
            let textsListen = function (textInfo) {

                this.medias.push(textInfo);
                this.index += 1;
            }

            courseOrigin[roomId].watcherListen("videos", videosListen);
            courseOrigin[roomId].watcherListen("images", imagesListen);
            courseOrigin[roomId].watcherListen("audios", audiosListen);
            courseOrigin[roomId].watcherListen("texts", textsListen);
        }

        // 监听连接的其它信息
        // 加入房间
        socket.on('join', join);
        // 监听来自客户端的消息
        socket.on('message', message);
        // 客户端录音上传
        socket.on('record',record);
        // 文件开始上传信号
         socket.on('start', start);
        // 文件上传中
        socket.on('upload', upload);
        // 结束当前直播
        socket.on('finish', finish);
        // 关闭连接
        socket.on('disconnect', disconnect);


        /* 连接加入 */
        function join(data) {

            console.log('join');
            // 获取用户名和权限
            user.name = data.name;
            user.isAdmin = data.isAdmin;
            // 为socket连接绑定权限
            socket.isAdmin = data.isAdmin;

            // 将用户归类到房间
            if(!roomUser[roomId]) {
                roomUser[roomId] = [];
            }

            // 将用户加入房间
            roomUser[roomId].push( JSON.stringify(user) );
            // 创建socket房间
            socket.join(roomId);
            // 触发系统消息
            socket.to(roomId).emit('systemMessage', {
                msg: user.name + '加入了房间!',
                type: 'text',
                from: 'system'
            });
            socket.emit('systemMessage', {
                msg: '欢迎加入房间!',
                type: 'text',
                from: 'system'
            });

            // 观察者方法
        }

        /* 有新消息 */
        function message(msg) {

            console.log('message');
            console.log('isAdmin: ' + socket.isAdmin);
            // 验证如果用户不在房间则不发消息
            if(roomUser[roomId].indexOf( JSON.stringify(user) ) < 0){
                return false;
            }
            // 验证是否是管理员发送的消息
            if(socket.isAdmin){
                courseOrigin[roomId].watcherTrigger('texts', {
                    type: 'texts',
                    from: user.name,
                    msg: msg,
                    url: '',
                    date: getDate()
                });
            }

            // 发送给房间的其它用户
            socket.to(roomId).emit('newMessage', {
                from: user.name,
                msg: msg,
                type: 'texts'
            });
            // 给自己发送相同的消息
            socket.emit('newMessage', {
                from: "我",
                msg: msg,
                type: 'texts'
            });
        }

        /* 音频数据二进制存储 */
        function record(info) {

            console.log('record data recieving');

            // 创建录音数据
            var recordData = {
                base64Data: info.base64Data,
                index: info.index,
                courseName: info.courseName,
                action: info.action
            };

            if(!Files.record){
                Files.record = {
                    data: '',
                    prePath: '',
                    savePath: '',
                    visitPath: ''
                };
            }

            // 组合替换字符串 [data:audio/wav;base64,]base64编码前缀
            var base64String = '' + recordData.base64Data;
            base64String = base64String.replace('data:audio/wav;base64,', '');

            // base64编码的字符串
            Files.record.data = base64String;

            // 将字符串转化成buffer
            var buffer = new Buffer(base64String, 'base64'),
            // buffer的写入长度
            bufferLength = buffer.length,
            // 文件的写入位置
            filePosition = null,
            // buffer的起始位置
            bufferPosition = 0;

            // 验证路径
            Files.record.prePath =
                locateFromRoot( ['/public/audios/courses/', recordData.courseName, '/'].join('') );
            // 存储路径
            Files.record.savePath =
                locateFromRoot( ['/public/audios/courses/', recordData.courseName, '/',
                recordData.index, '.wav'].join('') );
            // 访问路径
            Files.record.visitPath =
                ['/audios/courses/', recordData.courseName, '/',
                recordData.index, '.wav'].join('');

            // 验证路径是否存在
            if(!fs.existsSync(Files.record.prePath)){

                console.log('[build dir]:' + Files.record.prePath);
                fs.mkdirSync(Files.record.prePath);
            };

            // 以追加方式打开磁盘文件用于上传准备工作
            fs.open(Files.record.savePath, 'a', function (err, fd) {

                if (err){
                    console.log('[start] file open error: ' + err.toString());
                }else {
                    // 拿到文件描述符
                    Files.record.handler = fd;
                    fs.write(Files.record.handler,
                        buffer,
                        bufferPosition,
                        bufferLength,
                        filePosition,

                        function (err, written) {

                            if(err){
                                console.log('[file write]: ' + err);
                            }else {
                                // 内存中存储数据,全局变量
                                if(socket.isAdmin){

                                    courseOrigin[roomId].watcherTrigger('audios', {
                                        type: 'audios',
                                        date: getDate(),
                                        msg: info.index,
                                        from: user.name,
                                        url: Files.record.visitPath
                                    });
                                }

                                // 向客户端发送消息
                                var msgInfo = {
                                    from: user.name,
                                    type: "audios",
                                    path: Files.record.visitPath
                                };
                                console.log(Files.record.visitPath);
                                // 向其它用户发送消息
                                socket.to(roomId).emit('newMessage', msgInfo);
                                // 向自己发送消息
                                socket.emit('newMessage', msgInfo);
                            }
                            delete Files.record;
                            fs.close(fd, function () {
                               console.log('record done');
                            });
                    });
                }

            });
        }

        
        /* 文件开始上传信号 */
        function start(info){

            console.log('start...');
            // 文件名和文件大小和文件类型,课程名字
            var name  = info.Name,
                size = info.Size,
                courseName = info.CourseName;

            /*** 文件大小,data数据缓冲区(最大10M),downloaded已上传的长度,handler文件描述符 ***/
            Files.upload = {
                fileSize: size,
                data: '',
                downloaded: 0,
                handler: null,
                prePath: "",
                filePath: "",
                visitPath: "",
                type: 'files'
            };

            console.log('name+size: ' + name + size);

            //正则匹配判断文件类型
            var regVideo = /(mp4|flv|rmvb|wmv|mkv|avi)/i,
                regAudio = /(mp3|ape|wav|ogg|wma|aac|flac)/i,
                regImage = /(bmp|jpg|jpeg|svg|png|gif)/i;

            // 类型结尾
            if(regAudio.test( name.split('.').pop()) ){
                Files.upload.type = "audios";
            }else if(regImage.test( name.split('.').pop() )){
                Files.upload.type = "images";
            }else if(regVideo.test( name.split('.').pop() )){
                Files.upload.type = "videos";
            };

            // 验证文件的存放地址是否存在
            Files.upload.prePath = locateFromRoot( ['/public/', Files.upload.type, '/courses/',
                courseName].join('') );
            // 文件的客户端访问地址
            Files.upload.visitPath = ['/', Files.upload.type, '/courses/', courseName,
                '/', name].join('');
            // 不存在则创建目录
            if(!fs.existsSync(Files.upload.prePath)){
                console.log('build dir.');
                fs.mkdirSync(Files.upload.prePath);
            };
            // 完整存储地址
            var filePath = locateFromRoot( ['/public/', Files.upload.type, '/courses/',
                courseName, '/', name].join('') );

            console.log('filePath:'　+ filePath);
            Files.upload.filePath = filePath;

            // 以追加方式打开磁盘文件用于上传准备工作
            fs.open(Files.upload.filePath, 'a', function (err, fd) {

                if (err){
                    console.log('[start] file open error: ' + err.toString());
                }else {
                    Files.upload.handler = fd;

                    console.log('ready to get data.');
                    // 触发客户端从零开始上传数据
                    socket.emit('moreData',{
                        position: 0,
                        percent: 0
                    });
                }

            });

            // 获取上传百分比
            Files.upload.getPercent = function () {

                return parseInt( (this.downloaded / this.fileSize) * 100 ) + "%";
            };

            // 获取文件已经上传的长度 -- 用于客户端截取文件上传, 单位字节
            Files.upload.getPosition = function () {

                // 减小数字, 1024千字节
                var length = 1048576;
                return this.downloaded / length;
            };

        }

        /* 文件上传中 */
        function upload(info) {

            console.log('uploading...');
            // 名字和分段数据
            var fileName = info.Name,
                segment = info.Segment;

            // 已经上传的长度
            Files.upload.downloaded += segment.length;
            // 组合二进制字符(最大10M的缓存)
            Files.upload.data += segment;

            // 文件上传完毕
            if(Files.upload.downloaded == Files.upload.fileSize){

                console.log('upload done.');
                fs.write(Files.upload.handler, Files.upload.data, null, 'binary',function (err, written) {

                    var msgInfo = {
                        from: user.name,
                        msg: fileName,
                        type: Files.upload.type,
                        url: Files.upload.visitPath
                    };
                    // 向客户端发送上传结束消息
                    socket.emit('uploadDone');
                    // 向其它用户发送消息
                    socket.to(roomId).emit('newMessage', msgInfo);
                    // 向自己发送消息
                    socket.emit('newMessage', msgInfo);
                    /* 存储管理员消息 */
                    if(socket.isAdmin){

                        // 触发观察者
                        courseOrigin[roomId].watcherTrigger(msgInfo.type, {
                            from: user.name,
                            msg: fileName,
                            date: getDate(),
                            type: Files.upload.type,
                            url: Files.upload.visitPath
                        });
                    }

                    // 删除缓存文件
                    delete Files.upload;
                });

              // 10M的buffer被使用完
            }else if(Files.upload.data.length > 1024 * 1024 * 10){

                console.log('file splice.');
                fs.write(Files.upload.handler, Files.upload.data, null, 'binary',function (err, written) {
                    Files.upload.data = '';
                    socket.emit('moreData', {
                        'position': Files.upload.getPosition(),
                        'percent': Files.upload.getPercent()
                    });
                });

            // 继续填充缓冲区
            }else {

                console.log('more data in  position: ' + Files.upload.getPosition() +
                    " " + Files.upload.getPercent());
                socket.emit('moreData', {
                    'position': Files.upload.getPosition(),
                    'percent': Files.upload.getPercent()
                });
            }
        }

        /**
         * 结束直播,将直播数据导入到课程数据
         * 课程进入待发布状态
         * */
        function finish() {

            // 存储直播数据
            var courseOrigin = {
                courseName: roomId,
                medias: courseOrigin[roomId].medias
            };

            // 导入直播数据
            Course.importFromBroadcast(courseOrigin, function (err) {

                if(err) {
                    console.log('导入直播数据失败,结束直播操作失败!');
                    // 将错误发回给管理员
                    return socket.emit('finish_error', err);
                }

                // 将当前课程从直播中列表删除
                CourseBroadcastData.deleteOne({
                    courseName: roomId

                }, function (err) {
                    if(err){
                        console.log('课程从直播列表删除失败, 结束直播操作失败!');
                        return socket.emit('finish_error', err);
                    }
                    console.log('直播结束了!');
                    socket.emit('finish_done');
                });
            });
        }
        
        /* 客户端连接关闭 */
        function disconnect() {

            console.log('disconnect');
            // 离开房间
            socket.leave(roomId, function (err) {
                if(err){
                    console.log('leave room error!');
                }else {
                    var index = (roomUser[roomId] || []).indexOf( JSON.stringify(user) );
                    if(index !== -1){
                        // 数组删除
                        roomUser[roomId].splice(index, 1);
                        // 在房间内发布离开的消息
                        socket.to(roomId).emit('systemMessage', {
                            from: 'system',
                            msg : user.name + '离开了房间!'
                        });
                    }
                }
            });
        }


    });
}

module.exports = courseBroadcastAction;