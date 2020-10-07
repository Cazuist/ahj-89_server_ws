const uuid = require('uuid');

class User {
  constructor(name, status = true) {
    this.name = name;
    this.status = status;
    this.id = uuid.v4();
    this.messages = [];
  }

  addMessage(msg) {
    this.messages.push(msg);
  }
}

module.exports = User;