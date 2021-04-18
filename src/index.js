const { response } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const accounts = [];

function verifyIfExistsAccount(request, response, next) {
  const { cpf } = request.headers;

  const account = accounts.find(findAccount => findAccount.cpf === cpf);

  if (!account) {
    return response.status(400).json({ message: 'Account not found.' });
  }

  request.account = account;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
};

app.post('/accounts', (request, response) => {
   const { cpf, name } = request.body;

   const accountAlreadyExists = accounts.some(account => account.cpf === cpf);

  if (accountAlreadyExists) {
    return response.status(400).json({ message: 'Account already exists.' });
  }

   const account = {
     id: uuidv4(),
     cpf,
     name,
     statement: [],
   };

   accounts.push(account);

   response.status(201).json(account);
});

app.put('/accounts', verifyIfExistsAccount, (request, response) => {
  const { name } = request.body;
  const { account } = request;

  account.name = name;
  
  return response.json();
});

app.get('/accounts', verifyIfExistsAccount, (request, response) => {
  const { account } = request;

  return response.json(account);
});

app.delete('/accounts', verifyIfExistsAccount, (request, response) => {
  const { account } = request;

  accounts.splice(account, 1);

  return response.json(accounts);
});

app.get('/accounts/statements', verifyIfExistsAccount, (request, response) => {
  const { account } = request;

  return response.json(account.statement);
});

app.get('/accounts/statements/date', verifyIfExistsAccount, (request, response) => {
  const { date } = request.query;
  const { account } = request;

  const dateFormat = new Date(date + ' 00:00');

  const statement = 
    account.statement.filter(
      statement => 
        statement.created_at.toDateString() === 
        new Date(dateFormat).toDateString());

  return response.json(statement);
});

app.post('/accounts/statements/deposit', verifyIfExistsAccount, (request, response) => {
  const { description, amount } = request.body;
  const { account } = request;

  const operation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  };

  account.statement.push(operation);

  return response.status(201).send();
});

app.post('/accounts/statements/withdraw', verifyIfExistsAccount, (request, response) => {
  const { amount } = request.body;
  const { account } = request;

  const balance = getBalance(account.statement);

  if (balance < amount) {
    return response.status(400).json({ message: 'Insuficient funds.' });
  }

  const operation = {
    amount,
    created_at: new Date(),
    type: 'debit',
  };

  account.statement.push(operation);

  return response.status(201).send();
});

app.get('/accounts/balance', verifyIfExistsAccount, (request, response) => {
  const { account } = request;

  const balance = getBalance(account.statement);

  return response.json(balance);
})


app.listen(3333);