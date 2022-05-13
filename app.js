const express = require('express')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const multer = require('multer')
var path = require('path')
const session = require('express-session')
const { title } = require('process')
const app = express()
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { redirect } = require('express/lib/response')




const upload = multer({ dest: './public/uploads/' })
const io = new Server(server);




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
        res.locals.fullname = req.session.fullname
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
   if(res.locals.isLoggedIn){
       res.render('sell.ejs')
   }else {
       res.redirect('/login')
   }

  
})



app.post('/sell', upload.array('product-image', 6), (req, res) => {
   if(res.locals.isLoggedIn) {
    let filenames = []
    req.files.forEach(file => filenames.push(file.filename))
    const product = {
        title: req.body.title,
        description: req.body.description,
        price: Number(req.body.price),
        phonenumber: Number(req.body.phonenumber),
        location:req.body.location,
        filenames: filenames,
        category: req.body.category
    }
   
    connection.query(
        'INSERT INTO products (title, description, price, phonenumber, location, imageURLs, userID,category) VALUES (?,?,?,?,?,JSON_ARRAY(?),?,?)',
        [product.title, product.description, product.price, product.phonenumber,product.location, product.filenames, req.session.userId,product.category],   
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
   }else{
       res.redirect('/login')
   }
    
})



// route for all products
app.get('/', (req, res) => {
    connection.query(
        'SELECT * FROM products',
        (error, results) => {
            let products=[]
            products=results
            // const product = {
            //     title: results.title,
            //     description: results[0].description,
            //     price: results[0].price,
            //     phonenumber: results[0].phonenumber,
            //     location: results[0].location,
            //     imageURLs: JSON.parse(results[0].imageURLs),
            //     dateposted: results[0].dateposted
               
            // }
            // console.log(JSON.parse(results[0].imageURLs))
            // console.log(results[0].imageURLs)
            res.render('products.ejs', {products: products})
        }
    )
})




//route for  a singlle product


// app.get('//:id', (req, res) => {
//     connection.query(
//         'SELECT * FROM products ',
//         (error, results) => {
//             const product = {
//                 title: results.title,
//                 description: results[0].description,
//                 price: results[0].price,
//                 phonenumber: results[0].phonenumber,
//                 location: results[0].location,
//                 imageURLs: JSON.parse(results[0].imageURLs),
//                 dateposted: results[0].dateposted
//             }
//             console.log(JSON.parse(results[0].imageURLs))
//             console.log(results[0].imageURLs)
//             res.render('products.ejs', {product: product})
//         }
//     )
// })







app.post('/',(res,req)=>{
    if(res.locals.isLoggedIn){
        res.render('products.ejs')
    } else {
        res/redirect('/login')
    }
   
})







// app.get('//:id',(req,res) => {
//     if(res.locals.isLoggedIn){
//       connection.query(
//         'SELECT * FROM products WHERE id = ? AND userId = ?',
//         [req.params.id, req.session.userId],
//         (error,results) => {
//             if(results.length > 0){
//                 res.render('single-product.ejs',{product: results[0]})
//             } 
//       }

//     );
//     }else {
//         res.redirect('/login')
//     }
// })

app.get('/single-product/:id',(req,res) => {
    console.log('get here')
   
            connection.query(
                'SELECT * FROM products WHERE id = ?',
                [req.params.id],
                (error,results) => {
                    if(results.length > 0){
                        res.render('single-product.ejs',{product: results[0]})
                    } 
            }
    
        );
  
})




app.get('/edit/:id', (req, res) => {
    if(res.locals.isLoggedIn){
        connection.query(
            'SELECT * FROM products WHERE id = ? and userId = ?',
            [req.params.id, req.session.userId],
            (error, results) => {
                res.render('edit-product.ejs', {product:results[0]})
            } )
        } 
           else {
               res.redirect('/login')

        }   
})


app.post('/edit/:id', upload.array('product-image', 6), (req, res) => {
    if(res.locals.isLoggedIn) {
     let filenames = []
     req.files.forEach(file => filenames.push(file.filename))
     const product = {
         title: req.body.title,
         description: req.body.description,
         price: Number(req.body.price),
         phonenumber: Number(req.body.phonenumber),
         location:req.body.location,
         filenames: filenames,
         category: req.body.category
     }
    
     connection.query( 
         'UPDATE products SET title = ?, description=?, price = ?, phonenumber = ?, location = ?, imageURLs = JSON_ARRAY(?), userID = ?,category = ?  WHERE id= ?',
         [product.title, product.description, product.price, product.phonenumber,product.location, product.filenames, req.session.userId,product.category, req.params.id],   
         (error, results) => {     
             if(!error) {
                 console.log('product added successfully')
                 res.redirect('/')
             } else {
                 console.log(error)``
                  res.redirect('/')
             }
         }
     )
    }else{
        res.redirect('/login')
    }
     
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




app.get('/contact-seller/:id', (req, res) => {
    if(res.locals.isLoggedIn){
        res.render('contact-seller.ejs');
    }else {
        res.redirect('/login')
    }
});


io.on('connection', (socket) => {
    console.log('a user connected');
  });

  io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });


  io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
      io.emit('chat message', msg);
    });
  });






// app.get('/edit/:id', (req, res) => {
//     if(res.locals.isLoggedIn) {
//         connection.query(
//             `SELECT * FROM products WHERE id=${parseInt(req.params.id)}`,
//             (error,results)=>{
//                 res.render('edit-product.ejs', {product: results[0]})
//             }
//         )
//     }
// })





app.post('/contact-seller/:id', (req, res) => {
    res.render('contact-seller.ejs')
})




app.get('/logout', (req,res) => {
    req.session.destroy((error) => {
        res.redirect('/')
    })
})



// app.get('*', (req, res) => {
//     res.render('404.ejs')
// })




// ***********PRODUCT CATEGORIES
app.get('/products', (req,res)=>{

    if(req.query.category){
      connection.query(
        `SELECT * FROM products WHERE category = '${req.query.category}' `,
        (error, results)=>{
          res.render('products.ejs', {products: results})
          console.log(results)
        }
      )
    }else{
      let errorMessage = "Page Not Found "
      res.render("404.ejs");
    }
  })



const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Server up on PORT ${PORT}`)
})



