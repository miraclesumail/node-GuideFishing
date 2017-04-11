/**
 * Created by yangw on 2016/12/6.
 * 管理员测试路由
 * 用于测试和查看所有页面
 */

// 引入
var Admin = require('../models/Admin');

function ADMIN_TEMP(app){

    // 路由对象
    // isVariable -- 是否是可输入类型的变量
    var routes = {

        course: [{
            text: "[移动端查看] 正式课程列表页面",
            url: '/course/index',
            isVariable: false
        }, {
            text: "[移动端查看] 直播课程列表页面",
            url: '/course/broadcast/index',
            isVariable: false
        }, {
            text: "[桌面端查看] 管理员直播课程编辑页面",
            url: '/course/admin/edit',
            isVariable: false
        }, {
            text: "[移动端查看] 管理员直播课程登录页面",
            url: '/course/broadcast/room/adminCheck/:roomID',
            isVariable: true
        }, {
            text: "[移动端查看] 以用户身份进入某个课程直播间",
            url: '/course/broadcast/room/user/:roomID',
            isVariable: true
        }, {
            text: "[移动端查看] 以管理员身份进入某个课程直播间",
            url: '/course/broadcast/room/admin/:roomID',
            isVariable: true
        }],

        test:[{
            text: "[移动端查看] 所有测评列表页面",
            url: '/test/index',
            isVariable: false
        }, {
            text: "[桌面端查看] 管理员管理所有测评题目页面",
            url: '/test/admin/manager',
            isVariable: false
        }, {
            text: "[桌面端查看] 管理员编辑测评题目页面",
            url: '/test/admin/create',
            isVariable: false
        }],

        recruitment: [{
            text: "[移动端查看] 带渔入口页面",
            url: '/recruitment/index',
            isVariable: false
        }]
    };

    /* 获取页面 */
    app.get('/admin/routes', function (req, res, next) {
        adminCheck(req, res, next);
    } , function (req, res) {

        res.render('admin_routes', {
            title: '路由管理'
        });
    });
    
    /* 管理员登录页面 */
    app.get('/admin/login', function (req, res) {

        res.render('admin_login', {
            title: "带渔管理员登录"
        });
    });

    /* 新建管理员账号 */
    app.get('/admin/create', function (req, res) {

        var newAdmin = new Admin({
            account: "yangwei13@outlook.com",
            password: "yangwei020154",
            nickName: "Johnson",
            rank: 0,
            examineType: null
        });

        newAdmin.save(function (err, isPass) {

            if(err){
                console.log('[error]: ' + err);
                return res.json( JSON.stringify({
                    isError: true,
                    error: err
                }) );
            }
            if(isPass){
                console.log('0级管理员创建成功！');
                res.json( JSON.stringify({
                    isError: false,
                    isPass: true
                }) );
            }else {
                console.log('0级管理员创建失败！');
                res.json( JSON.stringify({
                    isError: true,
                    isPass: false
                }) );
            }
        });
    });

    /* 登录验证 */
    app.post('/admin/login', function (req, res) {

        var condition = {
            account: req.body.account,
            password: req.body.password
        };

        Admin.signin(condition, function (err, pass, info) {

            if(err){
                return res.json( JSON.stringify({
                    isError: true,
                    error: err
                }) );
            }
            if(!pass){
                return res.json( JSON.stringify({
                    isError: true,
                    error: "密码与账户不匹配！"
                }) );
            }
            // 验证成功,在session中写入管理员信息
            req.session.admin = {
                account: condition.account,
                nickName: info.nickName,
                examine: {
                    rank: info.examine.rank,
                    examineType: info.examine.rank == 0 ?
                         "无" : info.examine.examineType
                }
            };

            // 向客户端返回跳转地址
            res.json( JSON.stringify({
                isError: false,
                isPass: true,
                redirectUrl: "/admin/info"
            }) );
        });
    });

    /* 管理员进入个人页面 */
    app.get('/admin/info', function (req, res, next) {

        if(req.session.admin){
            return next();
        }
        return res.render('error', {
            message: "管理员信息未验证！",
            error: {
                status: 404
            }
        });

    }, function (req, res) {

        console.log(req.session.admin.examine.examineType);
        res.render('admin_info', {
            title: "管理员中心",
            account: req.session.admin.account,
            nickName: req.session.admin.nickName,
            rank: req.session.admin.examine.rank,
            examineType: req.session.admin.examine.examineType
        });
    });

    /* 管理员获取个人信息和需要被验证的信息 */
    app.post('/admin/info', function (req, res, next) {

        if(req.session.admin){
            return next();
        }
        return res.json( JSON.stringify({
            isError: true,
            error: {
                status: 404,
                message: '未验证权限'
            }
        }));
        
    }, function (req, res) {

        var rank = req.session.admin.examine.rank;
        var account = req.session.admin.account;
        // 检查管理员权限
        if(rank == 0){
            // 获取权限约束
            Admin.getPermissionConstraints(function (constraints) {

                return res.json( JSON.stringify({
                    isError: false,
                    permissionConstraints: constraints
                }) );
            });

        }else if(rank == 1){

            Admin.getExamineData({account: account}, function (err, examineContent) {

                if(err){
                    return res.json( JSON.stringify({
                        isError: true,
                        error: err
                    }) );
                }
                return res.json( JSON.stringify({
                    isError: false,
                    examineContent: examineContent
                }) );

            });
        }else if(rank == 2){

            Admin.getExamineProgress({account: account}, function (err, examineProgress) {

                if(err){
                    return res.json( JSON.stringify({
                        isError: true,
                        error: err
                    }) );
                }
                return res.json( JSON.stringify({
                    isError: false,
                    examineContent: examineProgress
                }) );
            });

        }else {

            res.json( JSON.stringify({
                isError: true,
                error: {
                    status: 404,
                    message: '账户信息有误'
                }
            }) );
        }

    });

    /* 0级管理员权限管理 */
    app.post('/admin/permission/:action', function (req, res, next) {
        if(req.session.admin.examine.rank === 0){
            return next();
        }
        return res.json( JSON.stringify({
            isError: true,
            error: {
                status: 404,
                message: "forbidden!"
            }
        }) );

    }, function (req, res) {


    });

    /* 管理员验证课程或测评数据条目 */
    app.post('/admin/:type/examine', function (req, res, next) {

    }, function (req, res) {

        var condition = {
            name: req.session.name,
            type: req.session.type,
            examineType: req.params.type
        };
        if(!condition.name || !condition.type || !condition.examineType){
            return req.json( JSON.stringify({
                isError: true,
                error: new Error("验证信息有误！")
            }) );
        }
        Admin.examinePass(condition, function (err, isPass) {

            if(err){
                return res.json( JSON.stringify({
                    isError: true,
                    error: err
                }) )
            }
            // 返回审查情况
            res.json( JSON.stringify({
                isError: false,
                isPass: isPass
            }) );
        });
    });

    /* 大管理员（0级）分配和修改权限 */
    app.post('/admin/permission', function (req, res, next) {

    }, function (req, res) {

    });

    
    /* 获取所有路由 */
    app.post('/admin/routes', function(req, res, next){
        adminCheck(req, res, next);
    }, function (req, res) {

        // 向客户端发送数据
        res.json(JSON.stringify( {
            routes: routes
        }) );
    });

    /* 页脚页面 */
    app.get('/admin/footer/:type', function (req, res) {

        res.render('admin_footerPage', {
            title: "其它",
            content: req.param("type")
        });
    });

    /* 权限验证中间件 */
    var adminCheck = function (req, res, next) {

        // 验证用户
        if(req.session.admin){
            return next();
        }else {
            res.render('admin_login', {
                title: "管理员登录"
            });
        }
    };
}

module.exports = ADMIN_TEMP;