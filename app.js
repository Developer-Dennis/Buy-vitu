const express = require('express')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const multer = require('multer')
const session = require('express-session')
const { title } = require('process')
const server = require('http').createServer();
const io = require('socket.io')(server)



const app = express()
const upload = multer({ dest: './public/uploads/' })





const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'buyvitu'
})



app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: false}))


app.use(session({
    secret: 'Buyvitu',
    resave: 'false',
    saveUninitialized: 'false'
}))


app.use((req,res,next) => {
    if(req.session.userId === undefined){
        res.locals.isLoggedIn = false
    } else {
        res.locals.isLoggedIn = true
        res.locals.userId = req.session.userId
        res.locals.username = req.session.username
    }
    next()
})






app.get('/signup',(req,res) => {
    let user = {
        email: '',
        fullname: '',
        gender: '',
        password: '',
        confirmPassword: ''
    }
    res.render('signup.ejs', {error:false, user: user})
})


app.post('/signup',(req,res) => {
    let user = {
        email: req.body.email,
        fullname: req.body.fullname,
        gender: req.body.gender,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    }
    if(user.password === user.confirmPassword) {
        connection.query(
            'SELECT email FROM users WHERE email = ?', [user.email],
            (error, results) => {
                if(results.length === 0) {
                    bcrypt.hash(user.password, 10, (error, hash) => {
                        connection.query(
                            'INSERT INTO users (email, fullname, gender, password) VALUES (?,?,?,?)',
                            [user.email, user.fullname, user.gender, hash],
                            (error, results) => {
                                res.redirect('/')
                            }
                        )
                    })
                } else {
                    let message = 'Email already exists.'
                    res.render('signup.ejs', {error: true, message: message, user: user})
                }
            }
        )
    } else {
        let message = 'Password & Confirm Password do not match.'
        console.log(user)
        res.render('signup.ejs', {error: true, message: message, user: user})
    }
})






app.get('/login',(req, res) => {
    let user = {
        email: '',
        password: ''
    }
    res.render('login.ejs', {error:false, user:user})
})


app.post('/login',(req,res) => {
    let user = {
        email: req.body.email,
        password: req.body.password
    }
    connection.query(
        'SELECT * FROM users WHERE email = ?', [user.email],
        (error, results) => {
            if (results.length > 0) {
                bcrypt.compare(user.password, results[0].password, (error, isEqual) => {
                    if(isEqual) {
                        req.session.userId = results[0].id
                        // console.log(req.session)
                        res.redirect('/')
                    } else {
                        let message = 'Email/Password mistmatch.'
                        res.render('login.ejs', {error: true, message: message, user: user})
                    }
                })

            } else {
                let message = 'Account does not exist. Please create one'
                res.render('login.ejs', {error: true, message: message, user: user})
            }
        }
    )    


})













app.get('/sell', (req, res) => {
   

    res.render('sell.ejs')
})



app.post('/sell', upload.array('product-image', 6), (req, res) => {
    let filenames = []
    req.files.forEach(file => filenames.push(file.filename))
    const product = {
        title: req.body.title,
        description: req.body.description,
        price: Number(req.body.price),
        phonenumber:req.body.phonenumber,
        location:req.body.location,
        filenames: filenames.toString()
    }
    console.log(product)
    connection.query(
        'INSERT INTO products (title, description, price, phonenumber, location, imageURLs, userID) VALUES (?,?,?,?,?,JSON_ARRAY(?),?)',
        [product.title, product.description, product.price, product.phonenumber,product.location, product.filenames, req.session.userId],
        (error, results) => {     
            if(!error) {
                console.log('product added successfully')
                res.redirect('/')
            } else {
                // console.log(error)
                 res.redirect('/')
            }
        }
    )
    
})




app.get('/', (req, res) => {
    connection.query(
        'SELECT * FROM products WHERE  userID=?',
        [req.session.userId],
        (error, products) => {
            
          
            res.render('products.ejs', {products: products})
        }
    )
})

app.post('/',(res,req)=>{
    res.render('products.ejs')
})


app.get('/edit/:id', (req, res) => {
    connection.query(
        `SELECT * FROM products WHERE id=${parseInt(req.params.id)}`,
        (error,results)=>{
            res.render('edit-product.ejs', {product: results[0]})
        }
    )
})




app.post('/edit/:id',upload.array('product-image', 6), (req, res) => {
    let filenames = []
    req.files.forEach(file => filenames.push(file.filename))
    const product = {
        title: req.body.title,
        description: req.body.description,
        price: Number(req.body.price),
        phonenumber: Number(req.body.phonenumber),
        location:req.body.location,
        filenames: filenames.join(','),
    }
    console.log(product)
    connection.query(
        `UPDATE  products SET title='${product.title}', description='${product.description}', price=${product.price}, phonenumber=${product.phonenumber}, location='${product.location}', imageURLs=${product.filenames}, userID=${req.session.userId} WHERE id =${Number(req.params.id)}`,
        (error, results) => {
        
            if(!error) {
                console.log('product added successfully')
                res.redirect('/')
            } else {
                console.log(error)
            }
        }
    )
})


app.post('/delete/:id', (req, res) => {
    if(res.locals.isLoggedIn){
        connection.query(
            'DELETE FROM products WHERE id = ?',
            [req.params.id],
            (error, results) => {
                res.redirect('/');
            }
        )
    }else {
        res.redirect('/');
    }
})








app.get('/contact-seller', (req, res) => {
    res.render('contact-seller.ejs')
})




app.get('/logout', (req,res) => {
    req.session.destroy((error) => {
        res.redirect('/')
    })
})











const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Server up on PORT ${PORT}`)
})