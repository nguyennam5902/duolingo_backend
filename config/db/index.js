const mongoose = require('mongoose');

const mongoUrl = `mongodb+srv://W6EIwZwSAhN7vi0Y:W6EIwZwSAhN7vi0Y@duolingo.jolnnpg.mongodb.net/duolingo`

async function connect() {
    try {
        await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connect MongoDB Successfully!!');
    } catch (error) {
        console.log('Connect MongoDB failure: ' + error.message);
    }
}

module.exports = { connect };