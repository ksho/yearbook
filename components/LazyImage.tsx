import React, { Component } from 'react';

import styled from 'styled-components';

type TParams =  { id: string };

interface IOwnProps {
    src: string,
    placeholder: string,
}

interface IOwnState {
  loadedSrc: string,
}

export default class LazyImage extends React.Component<IOwnProps, IOwnState> {
    // state = { src: null };

    constructor (props: any) {
      super(props);
      this.state = {
        loadedSrc: "",
      }
    }
  
    componentDidMount() {
      const { src, placeholder } = this.props;

      this.setState({ loadedSrc: placeholder });

      const imageLoader = new Image();
      imageLoader.src = src;
  
      imageLoader.onload = () => {
        this.setState({ loadedSrc: src });
      };


    }
  
    render() {
      return <FlexImage {...this.props} src={this.state.loadedSrc} />;
    }
}

const FlexImage = styled.img`
  max-height: 100%;
  min-width: 100%;
  object-fit: cover;
  vertical-align: bottom;
`;
