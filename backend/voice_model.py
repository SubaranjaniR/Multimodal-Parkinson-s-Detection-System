import torch
import torch.nn as nn
from transformers import HubertModel


class MultiHeadAttentionPooling(nn.Module):

    def __init__(self, hidden_size):
        super().__init__()

        self.attention = nn.Sequential(
            nn.Linear(hidden_size, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, 1)
        )

    def forward(self, x):

        attn_weights = self.attention(x)

        attn_weights = torch.softmax(attn_weights, dim=1)

        pooled = torch.sum(x * attn_weights, dim=1)

        return pooled


class ParkinsonVoiceModel(nn.Module):

    def __init__(self):

        super().__init__()

        self.hubert = HubertModel.from_pretrained(
            "facebook/hubert-base-ls960"
        )

        hidden_size = self.hubert.config.hidden_size

        self.pooling = MultiHeadAttentionPooling(hidden_size)

        self.fc1 = nn.Linear(hidden_size, 512)

        self.relu = nn.ReLU()

        self.dropout1 = nn.Dropout(0.4)

        self.fc2 = nn.Linear(512, 256)

        self.dropout2 = nn.Dropout(0.3)

        self.classifier = nn.Linear(256, 1)

    def forward(self, input_values):

        outputs = self.hubert(
            input_values=input_values
        )

        hidden_states = outputs.last_hidden_state

        x = self.pooling(hidden_states)

        x = self.fc1(x)

        x = self.relu(x)

        x = self.dropout1(x)

        embedding = self.fc2(x)

        embedding = self.relu(embedding)

        embedding = self.dropout2(embedding)

        logits = self.classifier(embedding)

        return logits, embedding
