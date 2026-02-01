---
layout: post
title: Machine Learning (ML) - Basics
categories: [ArtificialIntelligence, MachineLearning]
tags: [Artificial Intelligence(AI), Machine Learning(ML), Deep Learning(DL)]
---

### Introduction to Machine Learning

- Machine learning is a subfield of artificial intelligence that focuses on the development of algorithms and statistical models that enable computers to learn and make predictions or decisions without being explicitly programmed. 
- It has gained significant attention in recent years due to its ability to analyze large amounts of data and extract meaningful insights.

- Machine learning has two components:
1. **Learning & Teaching:**
    - Humans learn through a combination of theory and practice. Computers are no different. For a machine to understand the benefits and obstacles to your company’s success, you must first feed it with past experiences. 
    - These experiences are units of information that teach your machines trends and parallels derived from the data, which enable them to forecast future change.
2. **Predictions:**
    - Once the algorithm has seen enough past observations to be able to identify patterns confidently, you can make accurate predictions on new data. 
    - This is where the most valuable insights are extracted to inform the key business decision makers.


## Highlights

- 🤖 ML enables systems to learn from examples rather than relying on explicit rules.
- 📊 Good data — quantity and quality — is the foundation for useful ML models.
- ⚙️ The ML lifecycle includes collection, preprocessing, training, evaluation, deployment, and monitoring.
- 📈 Common problems include overfitting (model too complex) and underfitting (model too simple).
- 🧰 Choose algorithms and hardware (CPU/GPU/TPU) based on data size, latency needs, and budget.


## Machine Learning Algorithms

There are several machine learning algorithms that are commonly used. Some popular ones include:

1. **Linear Regression**: Used for predicting continuous values based on input features.
2. **Decision Trees**: Used for classification and regression tasks by creating a tree-like model of decisions and their possible consequences.
3. **Support Vector Machines**: Used for classification and regression tasks by finding the best hyperplane that separates data points into different classes.
4. **Neural Networks**: Used for complex pattern recognition and prediction tasks by simulating the behavior of the human brain.

## Main ingredients for machine learning

1. `Data` — Raw observations, records, images, signals, etc. Labeled data is required for supervised learning; unlabeled for unsupervised learning.
2. `Features` — Processed attributes derived from raw data that the model uses as input.
3. `Labels` — Labels are the correct answers in supervised learning, guiding the model on the expected outcome.
3. `Models & Algorithms` — The mathematical structures that learn relationships in data (e.g., linear models, trees, neural networks).
4. `Training Process` — loss functions, optimizers, hyperparameters, and validation strategies.
5. `Hardware & Infrastructure` — CPUs, GPUs, TPUs, storage, and orchestration for training and serving.

### Hardware quick notes

- `CPU`: good for small models, data preprocessing, and inference at low throughput.
- `GPU`: accelerates matrix operations, used for large models and deep learning training.
- `TPU` / `Specialized Accelerators`: used for very large-scale or latency-sensitive workloads.

## The ML lifecycle (overview)

1. Data collection: acquire representative data for the problem.
2. Data cleaning & preprocessing: handle missing values, normalize/scale features, encode categorical variables.
3. Feature engineering: create informative features or use automated feature extraction (e.g., embeddings).
4. Train: choose model architecture, loss, and optimizer; fit model on training set.
5. Validate: use a validation set or cross-validation to tune hyperparameters.
6. Evaluate: measure performance on a held-out test set using relevant metrics.
7. Deploy: export model and serve it for inference.
8. Monitor & maintain: track metrics, data drift, and retrain when necessary.

## Data, features and training

- Input data: raw observations (rows in a table, pixels in an image, time series, etc.).
- Labels/targets: the values you want to predict (for supervised learning).
- Training dataset: a sufficiently large, representative, and well-labeled set of examples used to fit model parameters.
- Validation dataset: used to tune hyperparameters and prevent overfitting.
- Test dataset: used only for final evaluation to estimate real-world performance.

Training phase essentials:

- Loss function: quantifies error (e.g., MSE for regression, cross-entropy for classification).
- Optimizer: algorithm to minimize loss (e.g., SGD, Adam).
- Batch size & epochs: control how many examples the model sees per update and how many passes over the data.
- Regularization: techniques like L1/L2, dropout, and early stopping to reduce overfitting.

## Inference

Inference is using a trained model to make predictions on new data. Consider latency, throughput, and resource constraints when deploying models for inference. Techniques like model quantization and batching can reduce latency and cost.

## Underfitting vs Overfitting

- Underfitting: model performs poorly on both training and validation data. Causes: model too simple, insufficient training, or poor features. Fixes: increase model capacity, add features, reduce regularization.
- Overfitting: model performs well on training data but poorly on validation/test data. Causes: model too complex, noisy features, or too little training data. Fixes: collect more data, use regularization, simplify model, use cross-validation, or augment data.

## Common ML system classifications

1. `Supervised learning` — learns a mapping from inputs to labeled outputs.
   - Classification: predict discrete labels (e.g., spam vs. ham). Example algorithms: logistic regression, decision trees, random forests, SVMs, neural networks.
   - Regression: predict continuous values (e.g., house price). Example algorithms: linear regression, polynomial regression, gradient boosting.

2. `Unsupervised learning` — finds structure in unlabeled data.
   - Clustering: group similar instances (e.g., K-means, hierarchical clustering, DBSCAN).
   - Dimensionality reduction: compress features while preserving structure (e.g., PCA, t-SNE, UMAP).

3. `Reinforcement learning` — learns by interacting with an environment to maximize cumulative reward (e.g., Q-learning, policy gradients, actor-critic methods).

## When to Use Each Type

- 🤖 Supervised learning is used when there is labeled data and a clear input-output relationship, best for classification and regression problems.
- 🧠 Unsupervised learning is used for analyzing and grouping data without predefined labels, best for clustering, anomaly detection, and pattern recognition.
- 🏎️ Reinforcement learning is used when a system needs to learn through interaction and feedback, best for robotics, game AI, and automation.

## Evaluation metrics (pick appropriately)

- Accuracy: fraction of correct predictions (useful for balanced classes).
- Precision / Recall / F1: useful for imbalanced classification problems.
- ROC AUC: measures ranking ability across thresholds.
- Mean Squared Error (MSE) / Mean Absolute Error (MAE): for regression tasks.
- Confusion matrix: inspect types of classification errors.

## Ethical Considerations in Machine Learning

While machine learning offers great potential, it also raises ethical considerations and challenges. Some important aspects to consider include:

- **Bias**: Machine learning algorithms can be biased if the training data is not representative of the real-world population, leading to unfair or discriminatory outcomes.
- **Privacy**: Machine learning often involves processing large amounts of personal data, raising concerns about privacy and data protection.
- **Interpretability**: Some machine learning models, such as deep neural networks, are often considered black boxes, making it difficult to understand how they arrive at their predictions.

### Applications of Machine Learning

Machine learning has a wide range of applications across various industries. Some common applications include:

1. **Healthcare**
- 💊 Machine learning is improving disease diagnosis and early detection by analyzing X-rays, MRIs, and genetic data.
- 💉 Machine learning is speeding up drug discovery by analyzing chemical structures and biological data.
- 🧬 Personalized treatments are being developed using machine learning to tailor treatments based on individual genetic profiles.

2. **Finance**
- 💳 Machine learning is used in fraud detection to stop fraudulent transactions in real-time.
- 💰 Credit scoring is improved with machine learning to assess credit worthiness more accurately.
- 📈 Algorithmic trading helps banks make data-driven investment decisions using machine learning.

3. **Retail**

- 🛍️ Personalized recommendations are made using machine learning to suggest products based on customer preferences.
- 💸 Dynamic pricing adjusts product prices in real-time based on demand, competition, and customer behavior.
- 📊 Inventory management and demand forecasting are optimized with machine learning to predict future sales trends.

4. **Transportation**: Machine learning is used for autonomous vehicles, traffic prediction, and route optimization.
5. **Marketing**: Machine learning is used for customer behavior analysis, targeted advertising, and churn prediction.

## Practical tips & checklist

- Start with a simple baseline (e.g., linear model or decision tree) to set expectations.
- Always split data into train/validation/test or use cross-validation.
- Examine data distributions and label quality before modeling.
- Monitor model behavior in production: track accuracy, latency, and data drift.
- Document experiments and hyperparameters for reproducibility.






