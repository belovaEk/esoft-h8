const { error } = require('console');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { constans } = require('http2')


const app = express();
const PORT = 3000;

// Middleware, которая автоматически парсит входящие JSON-данные из запросов
app.use(express.json())


// абсолютный путь к файлу db.json
const DB_PATH = path.join(__dirname, 'db.json');

let products = [];


async function loadData() {
    try{
        const data = await fs.readFile(DB_PATH, 'utf-8');
        products = JSON.parse(data)
    } catch(err) {
        if (err.code === 'ENOENT') {
            products = [];
            await saveData();
        } else {
            console.error('Ошибка загрузки данных:', err)
        }
    }
}


async function saveData() {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(products, null, 2)); // JSON.stringify(value, replacer, space)
    } catch (err){
        console.log('Ошибка сохранения данных:', err)
    }
}

loadData().then(() => {
    app.listen(PORT, () => {
        console.log(`Сервер запущен http://localhost:${PORT}`)
    })
})


app.get('/items', (req, res) => {
    res.json(products);
});

app.get('/items/:id', (req, res) =>{
    const index  = products.findIndex(p => p.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Продукт не найден' });
    }

    res.json(products[index]);
})

function validateProduct(product) {
    const errors = [];

    if (!product.name || typeof product.name !== 'string') {
        errors.push('Не указано имя или оно не является строкой');
    }

    if (typeof product.price !== 'number' || product.price <= 0) {
        errors.push('Цена должна быть числом > 0');
    }

    if (typeof product.quantity !== 'number' || product.quantity < 0) {
        errors.push('Кол-во должно быть положительным числом');
    }

    if (!product.category || typeof product.category !== 'string') {
        errors.push('Не указана категория или она не является строкой');
    }

    return errors;
}

app.post('/items', async(req, res) =>{
    const errors = validateProduct(req.body);
    if (errors.length > 0) {
        return res.status(400).json({errors});
    }

    const newProduct = {
        id: Date.now().toString(),
        name: req.body.name,
        price: req.body.price,
        quantity: req.body.quantity || 0,
        category: req.body.category || 'uncategorized',
    };

    products.push(newProduct);
    await saveData();

    res.status(201).json(newProduct);
})

app.put('/items/:id', async (req, res) => {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Продукт не найден' });
    }
    
    const errors = validateProduct(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    const updatedProduct = {
        ...products[index],
        ...req.body,
        id: req.params.id // Не позволяем менять ID
    };

    products[index] = updatedProduct;
    await saveData();
    
    res.json(updatedProduct);
})

app.delete('/items/:id', async (req, res) => {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Продукт не найден' });
    }
    
    products.splice(index, 1);
    await saveData();
    
    res.status(204).send();
});