/**
 * Created by yangw on 2017/4/18.
 * 审查模型
 */

var mongoose = require('./tools/Mongoose');
var examineSchema = require('./db_schema/examine_schema').examineSchema;
// 获取当前日期
var getDate = require('./tools/GetDate');

function Examine(examineData) {

    this.examineData = {
        contentName: examineData.contentName,
        contentType: examineData.contentType,
        status: 'isExaming',
        examineType: examineData.examineType,
        examineAccount: null,
        examineText: null,
        adminAccount: examineData.adminAccount,
        date: getDate()
    };
}

/* 存储审查数据 */
Examine.prototype.save = function (callback) {

    var db = mongoose.connection;
    var Model = mongoose.model('Examine', examineSchema);

    var newExamine = new Model(this.examineData);
    newExamine.save(function (err, doc) {

        if(err){
            console.log('[error]: ' + err);
            return callback(err);
        }
        callback(null);
    });
};

/* 删除审查数据 */
Examine.deleteOne = function (con, callback) {

    var db = mongoose.connection;
    var Model = mongoose.model('Examine', examineSchema);

    var condition = {
        contentName: con.contentName,
        contentType: con.contentType
    };

    var query = Model.findOne();
    query.where(condition);
    query.exec(function (err, doc) {

        if(err){
            console.log('[error]: ' + err);
            return callback(err);
        }
        if(doc){
            doc.remove(function (err, result) {

                if(err){
                    console.log(err);
                    return callback(err);
                }
                callback(null, true);
            });

        }else {
            callback(null, false);
        }
    });

};

/* 审查 */
Examine.examine = function (status, con, callback) {

    // Course模式和Test模式
    var Course = require('./Course');
    var Test = require('./AllTest');

    var db = mongoose.connection;
    var Model = mongoose.model('Examine', examineSchema);

    // 审查类型Course 和 Test
    var examineType = con.examineType;
    // 审查调用映射
    var examineData = {
        examineAction: {
            course: Course,
            test: Test
        },
        course: {
            adminAccount: con.adminAccount,
            courseName: con.contentName,
            courseType: con.contentType,
            examineAccount: con.examineAccount,
        },
        test: {
            adminAccount: con.adminAccount,
            testTitle: con.contentName,
            testType: con.contentType,
            examineAccount: con.examineAccount,
        }
    };

    // 初次进行存储
    if(status == "isExaming"){

        examineSave();
    }else {

        examineData.examineAction[examineType]
            .examine(status, examineData[examineType], function (err, isPass) {

            if(err){
                return callback(err);
            }

            examineUpdate();
        });

    }

    // 审查存储操作
    function examineSave() {

        Examine.deleteIfExit({
            contentName: con.contentName,
            contentType: con.contentType

        }, function (err) {

            if(err){
                console.log(err);
                return callback(err);
            }

            var newExamine = new Model({
                contentName: con.contentName,
                contentType: con.contentType,
                examineType: con.examineType,
                examineText: con.examineText,
                adminAccount: con.adminAccount,
                examineAccount: con.examineAccount,
                status: con.status,
                date: con.date
            });

            newExamine.save(function (err, doc) {

                if(err){
                    console.log(err);
                    return callback(err);
                }
                callback(null, true);
            });
        });

    }
    
    // 审查更新操作
    function examineUpdate() {

        var query = Model.findOne();
        query.where({
            contentName: con.contentName,
            contentType: con.contentType
        });
        query.exec(function (err, doc) {

            if(err){
                console.log(err);
                return callback(err);
            }
            if(doc){
                var query2 = doc.update({
                    $set: {
                        contentName: con.contentName,
                        contentType: con.contentType,
                        examineType: con.examineType,
                        examineText: con.examineText,
                        adminAccount: con.adminAccount,
                        examineAccount: con.examineAccount,
                        status: con.status,
                        date: con.date
                    }
                });

                query2.exec(function (err, doc) {

                    if(err){
                        console.log(err);
                        return callback(err);
                    }
                    console.log('examine true.');
                    callback(null, true)
                });

            }else {

                // 更新失败
                callback(null, false);
            }
        });
    }

};

/* 检查数据是否存在,如果存在的话先删除数据 */
Examine.deleteIfExit = function (condition, callback) {

    var db = mongoose.connection;
    var Examine = mongoose.model('Examine', examineSchema);

    var query = Examine.findOne();
    query.where(condition);

    // 执行搜索删除
    query.exec(function (err, doc) {

        if(err){
            console.log('[deleteIfExit error]: ' + err);
            return callback(err);
        }
        // 文档存在
        if(doc){
            // 删除本条数据
            doc.remove(function (err, deletedDoc) {
                if(err){
                    console.log('[deleteIfExit error]: ' + err);
                    return callback(err);
                }
                callback(null);
            });
        }else {
            callback(null);
        }
    });

};

/* 获取指定的审查数据 */
Examine.get = function (con, callback) {

    var db = mongoose.connection;
    var Model = mongoose.model('Examine', examineSchema);

    var query = Model.find();
    query.where(con);
    query.select({
        'adminAccount': 1,
        'contentName': 1,
        'contentType': 1,
        'examineType': 1,
        'status': 1
    });
    query.exec(function (err, docs) {

        if(err){
            console.log(err);
            callback(err);
        }
        if(docs){

            var examineData = [];
            for(let i = 0; i < docs.length; i++){

                examineData.push(docs[i]);
            }

            callback(null, examineData);
        }else {
            callback(null, false);
        }
    });
};

module.exports = Examine;
