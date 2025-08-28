// Datos de la aplicación
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentTransactionType = 'ingreso';
let financeChart = null;
let categoryChart = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Configurar fecha actual
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Configurar fecha por defecto en el formulario
    document.getElementById('date').value = now.toISOString().split('T')[0];
    
    // Cargar transacciones
    loadTransactions();
    updateSummary();
    createCharts();
    updateGoalProgress(); // Cargar metas al inicio
    
    // Configurar event listeners
    document.getElementById('transaction-form').addEventListener('submit', addTransaction);
    document.getElementById('filter-category').addEventListener('change', filterTransactions);
    document.getElementById('filter-type').addEventListener('change', filterTransactions);
    
    // Inicializar tipo de transacción
    setTransactionType('ingreso');
});

function setTransactionType(type) {
    currentTransactionType = type;
    const buttons = document.querySelectorAll('#transaction-form button');
    buttons.forEach(btn => btn.classList.remove('bg-blue-600', 'text-white'));
    
    const selectedBtn = Array.from(buttons).find(btn => 
        btn.textContent.toLowerCase().includes(type)
    );
    
    if (selectedBtn) {
        selectedBtn.classList.add('bg-blue-600', 'text-white');
    }
}

function addTransaction(e) {
    e.preventDefault();
    
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    
    if (!category || !description || !amount || !date) {
        alert('Por favor, completa todos los campos');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        type: currentTransactionType,
        category,
        description,
        amount,
        date,
        timestamp: new Date().toISOString()
    };
    
    transactions.push(transaction);
    saveTransactions();
    loadTransactions();
    updateSummary();
    createCharts();
    updateGoalProgress(); // Actualizar progreso de metas
    
    // Reset form
    document.getElementById('transaction-form').reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
}

function deleteTransaction(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        loadTransactions();
        updateSummary();
        createCharts();
        updateGoalProgress(); // Actualizar progreso de metas
    }
}

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function loadTransactions() {
    const list = document.getElementById('transactions-list');
    const filteredTransactions = filterTransactions();
    
    if (filteredTransactions.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-500">
                    No hay transacciones que coincidan con los filtros
                </td>
            </tr>
        `;
        return;
    }
    
    list.innerHTML = filteredTransactions.map(transaction => `
        <tr class="transaction-item border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm">${new Date(transaction.date).toLocaleDateString('es-ES')}</td>
            <td class="py-3 px-4 text-sm font-medium">${transaction.description}</td>
            <td class="py-3 px-4 text-sm">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.type === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${getCategoryName(transaction.category)}
                </span>
            </td>
            <td class="py-3 px-4 text-sm text-right font-semibold ${
                transaction.type === 'ingreso' ? 'text-green-600' : 'text-red-600'
            }">
                ${transaction.type === 'ingreso' ? '+' : '-'}${transaction.amount.toFixed(2)}
            </td>
            <td class="py-3 px-4 text-sm text-center">
                <button onclick="deleteTransaction(${transaction.id})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterTransactions() {
    const categoryFilter = document.getElementById('filter-category').value;
    const typeFilter = document.getElementById('filter-type').value;
    
    let filtered = transactions;
    
    if (categoryFilter) {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    // Ordenar por fecha (más reciente primero)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return filtered;
}

function updateSummary() {
    const totalIncome = transactions
        .filter(t => t.type === 'ingreso')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
        .filter(t => t.type === 'gasto')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalBalance = totalIncome - totalExpenses;
    
    document.getElementById('total-income').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
    document.getElementById('total-balance').textContent = `$${totalBalance.toFixed(2)}`;
    
    // Actualizar progreso
    const ratio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    document.getElementById('progress-bar').style.width = `${Math.min(ratio, 100)}%`;
    document.getElementById('ratio-text').textContent = `Ratio: ${ratio.toFixed(1)}%`;
    
    // Colores del progreso
    const progressBar = document.getElementById('progress-bar');
    if (ratio < 50) {
        progressBar.className = 'bg-green-600 h-2 rounded-full transition-all duration-500';
    } else if (ratio < 80) {
        progressBar.className = 'bg-yellow-600 h-2 rounded-full transition-all duration-500';
    } else {
        progressBar.className = 'bg-red-600 h-2 rounded-full transition-all duration-500';
    }
}

function createCharts() {
    // Gráfico principal de ingresos vs gastos
    const ctx = document.getElementById('finance-chart').getContext('2d');
    if (financeChart) {
        financeChart.destroy();
    }
    
    const last6Months = getLast6Months();
    const monthlyData = calculateMonthlyData(last6Months);
    
    financeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last6Months.map(m => m.label),
            datasets: [
                {
                    label: 'Ingresos',
                    data: monthlyData.income,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Gastos',
                    data: monthlyData.expenses,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Gráfico de categorías
    const ctxCategory = document.getElementById('category-chart').getContext('2d');
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const categoryData = calculateCategoryData();
    
    categoryChart = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: categoryData.labels,
            datasets: [{
                data: categoryData.values,
                backgroundColor: [
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(139, 92, 246, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(16, 185, 129, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function getLast6Months() {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            label: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
        });
    }
    
    return months;
}

function calculateMonthlyData(months) {
    const income = [];
    const expenses = [];
    
    months.forEach(m => {
        const monthIncome = transactions
            .filter(t => t.type === 'ingreso' && 
                   new Date(t.date).getFullYear() === m.year &&
                   new Date(t.date).getMonth() === m.month)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthExpenses = transactions
            .filter(t => t.type === 'gasto' && 
                   new Date(t.date).getFullYear() === m.year &&
                   new Date(t.date).getMonth() === m.month)
            .reduce((sum, t) => sum + t.amount, 0);
        
        income.push(monthIncome);
        expenses.push(monthExpenses);
    });
    
    return { income, expenses };
}

function calculateCategoryData() {
    const categories = {};
    
    transactions.forEach(t => {
        if (t.type === 'gasto') {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        }
    });
    
    const sorted = Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6);
    
    return {
        labels: sorted.map(([cat]) => getCategoryName(cat)),
        values: sorted.map(([,amount]) => amount)
    };
}

function getCategoryName(category) {
    const names = {
        'salario': 'Salario',
        'freelance': 'Freelance',
        'inversiones': 'Inversiones',
        'otros_ingresos': 'Otros ingresos',
        'alimentacion': 'Alimentación',
        'transporte': 'Transporte',
        'vivienda': 'Vivienda',
        'entretenimiento': 'Entretenimiento',
        'salud': 'Salud',
        'educacion': 'Educación',
        'otros_gastos': 'Otros gastos'
    };
    
    return names[category] || category;
}

function setMonthlyGoals() {
    const budget = prompt('¿Cuál es tu presupuesto mensual?');
    const savings = prompt('¿Cuál es tu meta de ahorro mensual?');
    
    if (budget !== null && savings !== null) { // Check for null to handle cancel button
        const parsedBudget = parseFloat(budget);
        const parsedSavings = parseFloat(savings);

        if (!isNaN(parsedBudget) && !isNaN(parsedSavings) && parsedBudget >= 0 && parsedSavings >= 0) {
            localStorage.setItem('monthlyBudget', parsedBudget);
            localStorage.setItem('monthlySavings', parsedSavings);
            updateGoalProgress();
        } else {
            alert('Por favor, introduce números válidos para el presupuesto y el ahorro.');
        }
    }
}

function updateGoalProgress() {
    const budget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
    const savings = parseFloat(localStorage.getItem('monthlySavings')) || 0;
    
    // Calcular gastos del mes actual
    const now = new Date();
    const currentMonthExpenses = transactions
        .filter(t => t.type === 'gasto' && 
                      new Date(t.date).getFullYear() === now.getFullYear() &&
                      new Date(t.date).getMonth() === now.getMonth())
        .reduce((sum, t) => sum + t.amount, 0);
    
    // Calcular ingresos del mes actual
    const currentMonthIncome = transactions
        .filter(t => t.type === 'ingreso' && 
                      new Date(t.date).getFullYear() === now.getFullYear() &&
                      new Date(t.date).getMonth() === now.getMonth())
        .reduce((sum, t) => sum + t.amount, 0);

    const currentSavings = currentMonthIncome - currentMonthExpenses;
    
    document.getElementById('budget-progress').textContent = `$${currentMonthExpenses.toFixed(2)} / $${budget.toFixed(2)}`;
    document.getElementById('savings-progress').textContent = `$${Math.max(0, currentSavings).toFixed(2)} / $${savings.toFixed(2)}`;
    
    // Actualizar barras de progreso
    const budgetProgress = budget > 0 ? (currentMonthExpenses / budget) * 100 : 0;
    const savingsProgress = savings > 0 ? (Math.max(0, currentSavings) / savings) * 100 : 0;
    
    document.querySelector('#budget-progress').previousElementSibling.querySelector('div').style.width = `${Math.min(budgetProgress, 100)}%`;
    document.querySelector('#savings-progress').previousElementSibling.querySelector('div').style.width = `${Math.min(savingsProgress, 100)}%`;

    // Opcional: Cambiar color de la barra de presupuesto si se excede
    const budgetProgressBar = document.querySelector('#budget-progress').previousElementSibling.querySelector('div');
    if (currentMonthExpenses > budget && budget > 0) {
        budgetProgressBar.classList.remove('bg-blue-600');
        budgetProgressBar.classList.add('bg-red-600');
    } else {
        budgetProgressBar.classList.remove('bg-red-600');
        budgetProgressBar.classList.add('bg-blue-600');
    }
}
