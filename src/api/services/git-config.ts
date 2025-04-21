interface GitConfig {
  user: {
    name: string;
    email: string;
  };
  commit: {
    gpgSign: boolean;
  };
}

export const gitConfig: GitConfig = {
  user: {
    name: "RooCode Bot",
    email: "bot@roocode.dev"
  },
  commit: {
    gpgSign: false
  }
};