# API 文档使用说明

本目录提供 LearnFlow 的 OpenAPI 合同文件：

- `openapi.yaml`

用途：

- 前后端接口对齐
- Mock Server 快速联调
- SDK 自动生成
- Contract Test（接口契约回归）

## 1. 本地预览（Swagger UI）

在项目根目录执行：

```bash
npx swagger-ui-watcher "docs/api/openapi.yaml" --port 3010
```

浏览器访问：

- [http://localhost:3010](http://localhost:3010)

## 2. 本地 Mock（Prism）

```bash
npx @stoplight/prism-cli mock "docs/api/openapi.yaml" -p 4010
```

Mock 地址：

- [http://localhost:4010](http://localhost:4010)

## 3. 生成 TypeScript SDK（OpenAPI Generator）

```bash
npx @openapitools/openapi-generator-cli generate -i "docs/api/openapi.yaml" -g typescript-axios -o "client/src/services/sdk"
```

## 4. 维护约定

- 当 `docs/product/planning/05-api-contract-draft.md` 更新时，需同步更新 `openapi.yaml`。
- 所有接口变更必须先更新合同文档，再改后端实现。
- CI 中建议增加 OpenAPI 校验，防止破坏式改动。
