import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function CategoriesView({
  darkMode,
  categories,
  categoryBudgets,
  showVal,
  setEditingCategory,
  setShowCategoryModal,
  deleteCategory
}) {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Gerenciar Categorias
        </h2>
        <button
          onClick={() => setShowCategoryModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Categorias de Despesa
          </h3>
          <div className="space-y-3">
            {categories
              .filter(c => c.type === 'expense')
              .map(category => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {category.name}
                      </span>
                      {categoryBudgets[category.id] > 0 && (
                        <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'} font-semibold mt-0.5 flex items-center gap-1`}>
                          🎯 Teto: {showVal(categoryBudgets[category.id])}/mês
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(category);
                        setShowCategoryModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar Categoria e Teto"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Categorias de Receita
          </h3>
          <div className="space-y-3">
            {categories
              .filter(c => c.type === 'income')
              .map(category => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {category.name}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(category);
                        setShowCategoryModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
