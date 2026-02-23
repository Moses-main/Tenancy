# Support

## Getting Help

If you need help with TENANCY, you've come to the right place. Here are some resources to help you get started.

## 📚 Documentation

- **Main README**: Start with the [README.md](./README.md) for an overview
- **Smart Contracts**: Inline documentation in contract source files
- **CRE Workflow**: See [cre-workflow/README.md](./cre-workflow/README.md)

## 🐛 Reporting Bugs

Found a bug? We want to squash it! Please follow these steps:

1. **Search existing issues** - Someone may have already reported it
2. **Create a new issue** - Use the bug report template
3. **Include details**:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment (OS, browser, Node version)

## 💬 Questions & Discussion

### Discord
Join our community Discord server (link coming soon)

### GitHub Discussions
Use GitHub Discussions for:
- General questions
- Feature ideas
- Show and tell

## 🩺 Troubleshooting

### Frontend Issues

**Frontend not building?**
```bash
# Clear and reinstall
rm -rf node_modules
npm install
npm run build
```

**Privy not working?**
- Verify `VITE_PRIVY_APP_ID` is correct in your `.env`
- Check app is configured for your domain in Privy dashboard

**Wallet not connecting?**
- Make sure you're on Sepolia testnet
- Check MetaMask is installed and unlocked
- Try using Incognito mode

### Smart Contract Issues

**Contracts not compiling?**
```bash
cd contracts
forge install
forge build --force
```

**Tests failing?**
- Ensure you have the latest dependencies
- Check your Node.js version (18+ required)

**Deployment failing?**
- Verify your RPC URL is correct
- Ensure you have sufficient testnet ETH
- Check private key is correct (no prefix issues)

## 📞 Contact

For security issues or sensitive matters, please contact the maintainers directly through GitHub.

## 🌐 System Status

- **Frontend**: Check Vercel dashboard for deployment status
- **Contracts**: Check Sepolia Etherscan for network status
- **Chainlink**: Check [status.chain.link](https://status.chain.link) for oracle status

---

*Thank you for using TENANCY!*
