# Claude Code 使い方ガイド

## 目次

1. [Claude Codeとは](#claude-codeとは)
2. [インストールとセットアップ](#インストールとセットアップ)
3. [基本的な使い方](#基本的な使い方)
4. [主要機能](#主要機能)
   - [スラッシュコマンド](#スラッシュコマンド)
   - [フック（Hooks）](#フックhooks)
   - [サブエージェント](#サブエージェント)
   - [Model Context Protocol（MCP）](#model-context-protocolmcp)
5. [実用的な使用例](#実用的な使用例)
6. [トラブルシューティング](#トラブルシューティング)
7. [よくある質問](#よくある質問)
8. [参考リンク](#参考リンク)

---

## Claude Codeとは

**Claude Code**は、Anthropicが開発した端末ベースのAI駆動型コーディングアシスタントです。最新のClaudeモデル（Sonnet 4.5やOpus 4.5）を活用し、コード生成、リファクタリング、デバッグ、ドキュメント作成などの開発業務を強力にサポートします。

### 主な特徴

- 🎯 **柔軟な設計**: 特定のワークフローを強制せず、開発者の作業スタイルに適応
- 🔧 **スクリプト化可能**: コマンドラインから自動化が可能
- 🌐 **完全なシステムアクセス**: コンピュータ全体へのアクセス権限
- 🤖 **マルチエージェント**: 複数の専門化されたエージェントを管理
- 🔌 **拡張性**: プラグイン、フック、MCPサーバーによる機能拡張

### 対象ユーザー

- **ソフトウェア開発者**: コード品質の向上と保守性の改善
- **オープンソース貢献者**: 未知のコードベースの理解を加速
- **DevOpsエンジニア**: コードレビューとリントの自動化

---

## インストールとセットアップ

### 1. インストール

**Linux / macOS**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows PowerShell**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**npm（推奨）**
```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

### 2. 初期設定

#### ステップ1: 環境確認
```bash
claude doctor
```
このコマンドで、インストールが正しく完了しているか確認できます。

#### ステップ2: 認証
Claude Codeを初めて起動すると、ブラウザでClaude Consoleに誘導され、OAuthによる認証を行います。

```bash
claude
```

#### ステップ3: プロジェクト初期化
プロジェクトディレクトリに移動して、以下のコマンドを実行します。

```bash
cd /path/to/your/project
claude
```

チャット内で以下を実行：
```
/init
```

これにより、プロジェクトのルートに`CLAUDE.md`ファイルが生成されます。このファイルは、Claude Codeがプロジェクトを理解するための重要なドキュメントです。

---

## 基本的な使い方

### 起動と対話

```bash
claude
```

プロンプトが表示されたら、自然言語で指示を出します。

**例:**
```
この関数をリファクタリングして、パフォーマンスを改善してください
```

```
READMEを英語で作成してください
```

```
エラーログを解析して、バグの原因を特定してください
```

### 組み込みコマンド

Claude Code起動中に使用できる便利なコマンド：

| コマンド | 説明 |
|---------|------|
| `/help` | 利用可能なコマンド一覧を表示 |
| `/init` | CLAUDE.mdファイルを生成 |
| `/context` | 現在のコンテキスト情報を表示 |
| `/usage` | APIの使用状況を確認 |
| `/model` | 使用中のモデル情報を表示 |
| `/todos` | TODO管理 |
| `/mcp` | MCPサーバー管理インターフェース |

---

## 主要機能

### スラッシュコマンド

スラッシュコマンドは、頻繁に使用するプロンプトをMarkdownファイルとして保存し、簡単に再利用できる機能です。

#### カスタムコマンドの作成

**プロジェクト専用コマンド**（チームで共有）
```bash
mkdir -p .claude/commands
touch .claude/commands/review.md
```

**ユーザー全体で使用できるコマンド**
```bash
mkdir -p ~/.claude/commands
touch ~/.claude/commands/review.md
```

**例: review.mdの内容**
```markdown
以下の基準でコードレビューを実施してください：

1. コードの可読性
2. パフォーマンス
3. セキュリティ
4. テストカバレッジ
5. ドキュメントの充実度

$ARGUMENTS
```

**使用方法**
```
/review src/main.js
```

`$ARGUMENTS`に`src/main.js`が渡されます。

---

### フック（Hooks）

フックは、Claude Codeの特定のライフサイクルイベントで自動実行されるシェルコマンドです。

#### 主要なフックイベント

| イベント | 説明 | タイミング |
|---------|------|----------|
| `UserPromptSubmit` | ユーザーがプロンプトを送信した時 | プロンプト送信後 |
| `PreToolUse` | ツール実行前 | ツール呼び出し前 |
| `PostToolUse` | ツール実行後 | ツール実行完了後 |
| `Stop` | エージェントが完了した時 | タスク完了後 |

#### フックの設定方法

**設定ファイル**: `~/.claude/settings.json`

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/scripts/git-check.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Bashコマンド実行前のチェック'"
          }
        ]
      }
    ]
  }
}
```

#### 実用例: Git自動チェックフック

**~/.claude/scripts/git-check.sh**
```bash
#!/bin/bash

# 変更があるか確認
if [[ -n $(git status -s) ]]; then
  echo "⚠️  未コミットの変更があります"
  git status -s
else
  echo "✅ Git作業ディレクトリはクリーンです"
fi
```

このスクリプトに実行権限を付与：
```bash
chmod +x ~/.claude/scripts/git-check.sh
```

---

### サブエージェント

サブエージェントは、特定のタスクに特化した専門AIアシスタントです。独自のシステムプロンプト、ツールセット、コンテキストウィンドウを持ちます。

#### 組み込みサブエージェント

1. **Plan Subagent**
   コードベースの理解とタスク計画に特化

2. **Explore Subagent**
   高速で軽量な読み取り専用エージェント。大規模プロジェクトの探索に最適

#### サブエージェントの利点

- **独立したコンテキスト**: メインエージェントのコンテキストを汚染しない
- **並列実行**: 複数のサブエージェントを同時に実行可能
- **タスク特化**: 特定の目的に最適化されたプロンプトとツール

#### カスタムサブエージェントの作成

`.claude/agents/`ディレクトリに設定ファイルを配置することで、プロジェクト専用のサブエージェントを作成できます。

---

### Model Context Protocol（MCP）

MCPは、Claude Codeを外部ツールやデータソースに接続するためのオープンソース標準プロトコルです。「AI向けのUSB-C」とも呼ばれています。

#### MCPサーバーの追加

```bash
# サーバーを追加
claude mcp add server-name --scope user

# サーバー一覧を表示
claude mcp list

# サーバーを削除
claude mcp remove server-name

# サーバー情報を取得
claude mcp get server-name
```

#### MCPの用途

- **ウェブ検索**: リアルタイムの情報取得
- **データベースアクセス**: SQL実行やデータ操作
- **API統合**: 外部サービスとの連携
- **ファイルシステム拡張**: クラウドストレージへのアクセス

#### セキュリティ注意事項

⚠️ サードパーティのMCPサーバーは、信頼できる提供元からのみ使用してください。MCPサーバーはシステムへの広範なアクセス権を持つ可能性があります。

---

## 実用的な使用例

### 1. コードレビューと品質改善

**プロンプト:**
```
このプロジェクト全体をレビューして、保守性とパフォーマンスを改善する具体的な提案をしてください
```

Claude Codeは、従来のlintツールでは検出できない主観的なコード品質の問題を指摘します。

---

### 2. ドキュメント自動生成

**プロンプト:**
```
すべてのパブリック関数にJSDocコメントを追加し、包括的なREADME.mdを生成してください
```

---

### 3. 未知のコードベースの理解

Explore Subagentを使用して、大規模プロジェクトを素早く分析：

**プロンプト:**
```
このプロジェクトのアーキテクチャを説明してください。主要なモジュール、データフロー、依存関係を図解してください
```

---

### 4. テスト自動生成

**プロンプト:**
```
src/utils/parser.jsの単体テストをJestで生成してください。エッジケースも含めてください
```

---

### 5. リファクタリング

**プロンプト:**
```
このモジュールの重複コードを削除し、適切なデザインパターンを適用してください
```

---

### 6. バグ修正とデバッグ

**プロンプト:**
```
以下のエラーメッセージの原因を特定し、修正してください：
[エラーログを貼り付け]
```

---

### 7. 言語/フレームワークのマイグレーション

**プロンプト:**
```
このExpressアプリをFastifyに移行してください。すべてのミドルウェアとルートを変換してください
```

---

## トラブルシューティング

### 診断コマンド

```bash
# 一般的な診断
claude doctor

# 詳細ログを有効化
claude --verbose

# MCP設定のデバッグ
claude --mcp-debug
```

### よくある問題と解決方法

| 問題 | 解決方法 |
|------|---------|
| **インストール失敗** | Node.jsのバージョンを確認（推奨: v18以上）<br>`node --version` |
| **認証エラー** | OAuthフローを再実行<br>`claude auth logout && claude` |
| **ツール実行失敗** | パーミッションを確認<br>`chmod +x script.sh` |
| **パフォーマンス低下** | 不要なファイルを除外<br>`.claudeignore`ファイルを作成 |
| **WSL環境での問題** | Linux版npmを優先<br>`export PATH="/usr/bin:$PATH"` |

### .claudeignoreファイルの作成

プロジェクトのルートに`.claudeignore`ファイルを作成することで、Claude Codeが無視するファイルを指定できます。

```
node_modules/
dist/
build/
*.log
.env
```

---

## よくある質問

### Q1: Claude Codeは単なるコード補完ツールですか？

**A:** いいえ。Claude Codeは完全なAI駆動型エージェントで、コンピュータ全体へのアクセス権を持ち、複雑なマルチステップタスク、テスト実行、ツール統合が可能です。

---

### Q2: どのモデルが使用されていますか？

**A:** Claude Sonnet 4.5（高速・バランス型）とOpus 4.5（高精度）が使用されます。タスクに応じてモデルを選択できます。

---

### Q3: オフラインで動作しますか？

**A:** いいえ。Claude CodeはAnthropicのAPIと通信するため、インターネット接続が必須です。

---

### Q4: プライバシーとセキュリティは？

**A:** コードはAnthropicのサーバーに送信されます。機密情報を含むプロジェクトでは、適切なアクセス制御とプライバシーポリシーの確認が必要です。

---

### Q5: カスタムコマンドの保存場所は？

**A:**
- **プロジェクト専用**: `.claude/commands/`（Gitで共有可能）
- **ユーザー全体**: `~/.claude/commands/`（すべてのプロジェクトで利用可能）

---

### Q6: フックの実行タイムアウトは？

**A:** デフォルトは60秒です。設定ファイルでカスタマイズ可能です。

---

### Q7: MCPサーバーのトークン制限は？

**A:** デフォルトの最大出力は25,000トークンです。環境変数`MAX_MCP_OUTPUT_TOKENS`で変更可能です。

```bash
export MAX_MCP_OUTPUT_TOKENS=50000
```

---

### Q8: 大規模プロジェクトでのパフォーマンス最適化は？

**A:**
1. `.claudeignore`で不要なファイルを除外
2. Explore Subagentを使用して軽量な探索を実行
3. 特定のディレクトリやファイルに焦点を絞る

---

### Q9: チームでClaude Codeを共有するには？

**A:**
- `.claude/`ディレクトリをGitにコミット
- プロジェクト専用のスラッシュコマンドとサブエージェントを共有
- ドキュメント（CLAUDE.md）を充実させる

---

### Q10: Claude CodeとGitHub Copilotの違いは？

**A:**
- **Copilot**: コード補完に特化、IDEとの統合
- **Claude Code**: 完全なエージェント、複雑なタスク、マルチファイル操作、システム全体へのアクセス

両者は補完的に使用できます。

---

## 参考リンク

### 公式ドキュメント
- [Claude Code 公式サイト](https://code.claude.com/)
- [セットアップガイド](https://code.claude.com/docs/en/setup)
- [スラッシュコマンド](https://code.claude.com/docs/en/slash-commands)
- [フック](https://code.claude.com/docs/en/hooks)
- [サブエージェント](https://code.claude.com/docs/en/sub-agents)
- [MCP統合](https://docs.anthropic.com/en/docs/claude-code/mcp)

### ベストプラクティス
- [Claude Code ベストプラクティス（Anthropic公式）](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Builder.io - Claude Code の使い方とコツ](https://www.builder.io/blog/claude-code)

### チュートリアル
- [DataCamp - Claude Code ガイド](https://www.datacamp.com/tutorial/claude-code)
- [Codecademy - チュートリアル](https://www.codecademy.com/article/claude-code-tutorial-how-to-generate-debug-and-document-code-with-ai)

### コミュニティリソース
- [awesome-claude-code (GitHub)](https://github.com/hesreallyhim/awesome-claude-code)
- [claude-code-hooks-mastery (GitHub)](https://github.com/disler/claude-code-hooks-mastery)
- [awesome-claude-code-subagents (GitHub)](https://github.com/VoltAgent/awesome-claude-code-subagents)

---

## まとめ

Claude Codeは、単なるコード補完ツールではなく、開発プロセス全体を支援する強力なAIエージェントです。スラッシュコマンド、フック、サブエージェント、MCP統合などの機能を活用することで、開発の生産性を大幅に向上させることができます。

このガイドを参考に、Claude Codeをあなたの開発ワークフローに統合し、その真の力を体験してください。

---

**最終更新**: 2025年11月27日
**バージョン**: 1.0
