let products = document.querySelectorAll('.product');
   

products.forEach(product => {
    product.addEventListener('click', function(e){
        e.preventDefault();
        // let note = e.target.firstElementChild;
        location.href = product.firstElementChild.href
    })
})