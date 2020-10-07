const http = require('http');
const fs = require('fs');
const path = require('path');
const WS = require('ws');
const Koa = require('koa');
const koaBody = require('koa-body');
const { v4 } = require('uuid');
const moment = require('moment');
const User = require('./classes/User.js');

const app = new Koa();
const port = process.env.PORT || 7070;

app.use(koaBody({
  urlencoded: true,
  multipart: true,
}));

// CORS
app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin'); 
  
  if (!origin) {
    return await next();
  }  

  const headers = { 'Access-Control-Allow-Origin': '*', };
  
  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({...headers});
    try {
      return await next();
    } catch (e) {
      e.headers = {...e.headers, ...headers};
      throw e;
    }
  }
  
  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });
  
    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Allow-Request-Headers'));
    }
  
    ctx.response.status = 204;
  }
});

//WS
const server = http.createServer(app.callback()).listen(port);
const wsServer = new WS.Server({server})

let clients = [];
let instances = [
  {
    id: v4(),
    state: 'stopped',
  }
];

wsServer.on('connection', (ws, req) => {
  ws.on('message', (msg) => {
    const request = JSON.parse(msg);
    const { method, data } = request;
    let response = {};
    response.method = method;

    /* Dashboard logic --------------------------------------*/
    if (method === 'loadInstances') {      
      response.status = true;
      response.data = instances;
      ws.send(JSON.stringify(response));
      return;
    }

    if (method === 'createRequest') {
      const id = v4();
      response.method = 'createRequest';
      response.status = true;
      response.text = 'Get request on creating';
      response.data = { id };
      response.date = moment().format('hh:mm:ss DD.MM.YY');
      ws.send(JSON.stringify(response));      

      setTimeout(() => {
        const newInstance = {id, state: 'stopped',};
        instances.push(newInstance);
        
        response.method = 'createResponse';
        response.text = 'Created';
        response.date = moment().format('hh:mm:ss DD.MM.YY');
        response.data = newInstance;
        ws.send(JSON.stringify(response));
      }, 20000);

      return;
    }

    if (method === 'switchRequest') {      
      const id = data.id;
      response.status = true;
      response.text = `Get request on server ${data.state === 'stopped' ? 'run' : 'stop'}`;
      response.data = { id };
      response.date = moment().format('hh:mm:ss DD.MM.YY');
      ws.send(JSON.stringify(response));

      const filtered = instances.find((instance) => instance.id === id);

      setTimeout(() => {
        filtered.state = data.state === 'stopped' ? 'running' : 'stopped';        
        response.method = 'switchResponse';
        response.text = `${data.state === 'stopped' ? 'Started' : 'Stopped'}`;
        response.date = moment().format('hh:mm:ss DD.MM.YY');
        ws.send(JSON.stringify(response));
      }, 20000);
    }

    if (method === 'deleteRequest') {      
      const id = data.id;
      response.status = true;
      response.text = `Get request on server deleting`;
      response.data = { id };
      response.date = moment().format('hh:mm:ss DD.MM.YY');
      ws.send(JSON.stringify(response));

      setTimeout(() => {
        instances = instances.filter((instance) => instance.id !== id);               
        response.method = 'deleteResponse';
        response.text = `Removed`;
        response.date = moment().format('hh:mm:ss DD.MM.YY');
        ws.send(JSON.stringify(response));
      }, 20000);
    }
    
    /* Online chat logic --------------------------------------*/
    if(method === 'newNick') {        
      response.method = method;

      if(clients.find((client) => client.name === data)) {
        response.status = false;
      } else {
        response.status = true;
        clients.push(new User(data));
        response.data = clients.filter((client) => client.status);
      }

      wsServer.clients.forEach((client) => client.send(JSON.stringify(response)));      
      return;
    }

    if (method === 'delUser') {
      response.method = method;
      response.status = true;
      clients = clients.filter((client) => client.name !== data);
      response.data = clients;

      wsServer.clients.forEach((client) => client.send(JSON.stringify(response)));
    }

    if(method === 'newMsg') {
      response.method = method;
      response.status = true;
      const filtered = clients.filter((client) => client.name === data.userName)[0];
      filtered.messages.push(data);      
      response.data = data;

      wsServer.clients.forEach((client) => client.send(JSON.stringify(response)));
      return;
    }
  });
});
