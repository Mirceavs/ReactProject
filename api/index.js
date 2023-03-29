const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/user');
const Post = require('./models/Post');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const cookieParser = require('cookie-parser');
const privateKey = '21431asfafadasgfaewwg';
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));


app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    try {
        const userDoc = await User.create({
            username, 
            password: await bcrypt.hash(password, 10),
        });
        res.json(userDoc);
    } catch(e) {
        res.status(400).json(e);
    }
});

app.post('/login', async (req,res) => {
    const {username, password} = req.body;
    const userDoc = await User.findOne({username});
    const passOk = await bcrypt.compare(password, userDoc.password);
    if(passOk){
        //logged in
        jwt.sign({username, id:userDoc._id}, privateKey, {}, (err,token) => {
            if(err) throw err;
            res.cookie('token', token).json({
                id:userDoc._id,
                username,
            });
        });
    } else {
        res.status(400).json('wrong credentials');
    }
});

app.get('/profile', (req,res) => {
    const {token} = req.cookies;
    jwt.verify(token, privateKey, {}, (err,info) => {
        if(err) throw err;
        res.json(info);
    });
});

app.post('/logout', (req,res) =>{
    res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req,res, next) => {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1 ];
    const newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
    
    const {token} = req.cookies;
    jwt.verify(token, privateKey, {}, async (err,info) => {
        if(err) throw err;
        const {title, summary, content} = req.body;
        const postDoc = await Post.create({
            title,
            summary,
            content,
            cover:newPath,
            author:info.id,
        });
        res.json(postDoc);
    });
});

    app.put('/post', uploadMiddleware.single('file'), async (req,res) => {
        let newPath = null;
        if (req.file) {
            const {originalname,path} = req.file;
            const parts = originalname.split('.');
            const ext = parts[parts.length - 1 ];
            newPath = path+'.'+ext;
            fs.renameSync(path, newPath); // to-do: format this as a function
        }

        const {token} = req.cookies;
        jwt.verify(token, privateKey, {}, async (err,info) => {
        if (err) throw err;
        const {id, title, summary, content} = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author)  === JSON.stringify(info.id);

        if (!isAuthor) {
            return res.status(400).json('you are not the author');
        }

        await postDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover
        });

        res.json(postDoc);
    });
});

    app.get('/post', async (req,res) => {
        res.json(
        await Post.find()
            .populate('author', ['username'])
            .sort({createdAt: -1})
            .limit(20)
        );
    });

    app.get('/post/:id', async(req,res) => {
        const {id} = req.params;
        const postDoc = await Post.findById(id).populate('author', ['username']);
        res.json(postDoc);
    })


// 

mongoose.set("strictQuery", false);
mongoose.connect('mongodb+srv://mirceavs:auRIy9QCVay4ZUcb@cluster0.ggy3cuj.mongodb.net/?retryWrites=true&w=majority')
.then(() => {
    console.log('Connected to MongoDB');
    app.listen(4000, () => {
    console.log('server is running on port 4000...');
});
}).catch(() => {
    console.log(err);
})
//

