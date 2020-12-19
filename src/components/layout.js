import React from "react"
import { Link } from "gatsby"

const Layout = ({ location, title, children }) => {
  const rootPath = `${__PATH_PREFIX__}/`
  const isRootPath = location.pathname === rootPath
  let header

  if (isRootPath) {
    header = (
      <h1 className="main-heading">
        <Link to="/">{'首页'}</Link>
      </h1>
    )
  } else {
    header = (
      <Link className="header-link-home" to="/">
        {'首页'}
      </Link>
    )
  }

  return (
    <div className="global-wrapper" data-is-root-path={isRootPath}>
      {/* <header className="global-header">{header}</header> */}
      <main>{children}</main>
      <footer>
        {/* © {new Date().getFullYear()}, Built with
        {` `} */}
        {/* <span>wanghao</span> */}
        <span>京ICP备18062500号-1</span>
      </footer>
    </div>
  )
}

export default Layout
