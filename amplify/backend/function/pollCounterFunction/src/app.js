/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/


console.log("***** START pollCounter *****")
const AWS = require('aws-sdk')
var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
var bodyParser = require('body-parser')
var express = require('express')

AWS.config.update({
  region: process.env.TABLE_REGION
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

let tableName = "pollCounterDDB";
if (process.env.ENV && process.env.ENV !== "NONE") {
  tableName = tableName + '-' + process.env.ENV;
}

const userIdPresent = false; // TODO: update in case is required to use that definition
const partitionKeyName = "partitionKey";
const partitionKeyType = "S";
const sortKeyName = "sortKey";
const sortKeyType = "S";
const hasSortKey = sortKeyName !== "";
const path = "/votes";
const UNAUTH = 'UNAUTH';
const hashKeyPath = '/:' + partitionKeyName;
const sortKeyPath = hasSortKey ? '/:' + sortKeyName : '';
// declare a new express app
var app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
});

// convert url string param to expected Type
const convertUrlType = (param, type) => {
  switch (type) {
    case "N":
      return Number.parseInt(param);
    default:
      return param;
  }
}

/********************************
 * HTTP Get method for list objects *
 ********************************/

app.get(path + hashKeyPath, function (req, res) {

  console.log("***** GET  pollCounter *****")

  var condition = {}
  condition[partitionKeyName] = {
    ComparisonOperator: 'EQ'
  }

  if (userIdPresent && req.apiGateway) {
    condition[partitionKeyName]['AttributeValueList'] = [req.apiGateway.event.requestContext.identity.cognitoIdentityId || UNAUTH];
  } else {
    try {
      condition[partitionKeyName]['AttributeValueList'] = [convertUrlType(req.params[partitionKeyName], partitionKeyType)];
    } catch (err) {
      res.statusCode = 500;
      res.json({
        error: 'Wrong column type ' + err
      });
    }
  }

  let queryParams = {
    TableName: tableName,
    KeyConditions: condition
  }

  dynamodb.query(queryParams, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.json({
        error: 'Could not load items: ' + err
      });
    } else {
      res.json(data.Items);
    }
  });
});

/*****************************************
 * HTTP Get method for get single object *
 *****************************************/

app.get(path + '/object' + hashKeyPath + sortKeyPath, function (req, res) {
  var params = {};
  if (userIdPresent && req.apiGateway) {
    params[partitionKeyName] = req.apiGateway.event.requestContext.identity.cognitoIdentityId || UNAUTH;
  } else {
    params[partitionKeyName] = req.params[partitionKeyName];
    try {
      params[partitionKeyName] = convertUrlType(req.params[partitionKeyName], partitionKeyType);
    } catch (err) {
      res.statusCode = 500;
      res.json({
        error: 'Wrong column type ' + err
      });
    }
  }
  if (hasSortKey) {
    try {
      params[sortKeyName] = convertUrlType(req.params[sortKeyName], sortKeyType);
    } catch (err) {
      res.statusCode = 500;
      res.json({
        error: 'Wrong column type ' + err
      });
    }
  }

  let getItemParams = {
    TableName: tableName,
    Key: params
  }

  dynamodb.get(getItemParams, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.json({
        error: 'Could not load items: ' + err.message
      });
    } else {
      if (data.Item) {
        res.json(data.Item);
      } else {
        res.json(data);
      }
    }
  });
});




/************************************
 * HTTP post method for insert object *
 *************************************/

app.post(path, function (req, res) {

  console.log("***** POST  pollCounter *****")

  if (userIdPresent) {
    req.body['userId'] = req.apiGateway.event.requestContext.identity.cognitoIdentityId || UNAUTH;
  }

  let updateItemParams = {
    TableName: tableName,
    Key: {
      partitionKey: 'poll-001',
      sortKey: 'total'
    },
    UpdateExpression: `set ${UpdateAttribute} = ${UpdateAttribute} + :val`,
    ExpressionAttributeValues: {
      ":val": 1
    },
    ReturnValues: "UPDATED_NEW"
  }

  console.log("***** POST updateItemParams *****")
  console.log(updateItemParams);
  console.info("***** INFO Log  *****")
  console.warm("***** WARM log  *****")

  res.json({
    success: 'post call succeed! Marcos ',
    url: req.url,
    data: data
  })



});

/*
app.postx(path, function (req, res) {

  console.log("***** POST  pollCounter *****")

  if (userIdPresent) {
    req.body['userId'] = req.apiGateway.event.requestContext.identity.cognitoIdentityId || UNAUTH;
  }

  const UpdateAttribute = req.query['vote'] === 'no' ? 'voteNo' : 'voteYes'

  //let putItemParams = {
  //  TableName: tableName,
  //  Item: req.body
  // }

  let updateItemParams = {
    TableName: tableName,
    Key: {
      partitionKey: 'poll-001',
      sortKey: 'total'
    },
    UpdateExpression: `set ${UpdateAttribute} = ${UpdateAttribute} + :val`,
    ExpressionAttributeValues: {
      ":val": 1
    },
    ReturnValues: "UPDATED_NEW"
  }



  console.log("***** POST updateItemParams *****")
  console.log(updateItemParams);
  console.info("***** INFO Log  *****")
  console.warm("***** WARM log  *****")



  dynamodb.update(updateItemParams, (err, data) => {
    if (err) {
      res.statusCode = 500;
      console.log('****** ERRROR here *******')
      res.json({
        error: err,
        url: req.url,
        body: updateItemParams
      });
    } else {
      res.json({
        success: 'post call succeed!',
        url: req.url,
        data: data
      })
    }
  })

  
  dynamodb.put(putItemParams, (err, data) => {
    if(err) {
      res.statusCode = 500;
      res.json({error: err, url: req.url, body: req.body});
    } else{
      res.json({success: 'post call succeed!', url: req.url, data: data})
    }
  });
  

});
*/



app.listen(3000, function () {
  console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app